import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { ITEM_DEFINITIONS } from '../constants';
import { ItemDefinition } from '../types';

interface Props {
  onDragStart: (defId: string, x: number, y: number) => void;
  itemsToSpawn: string[]; // List of defIds to spawn
  onItemsSpawned: () => void; // Callback to clear spawn queue
}

const CELL_SIZE_PHYSICS = 30;

const TW_COLORS: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-slate-400': '#94a3b8',
  'bg-amber-600': '#d97706',
  'bg-emerald-600': '#059669',
  'bg-purple-500': '#a855f7',
  'bg-yellow-700': '#a16207'
};

const textureCache: Record<string, string> = {};

const generateItemTexture = (def: ItemDefinition): string => {
  if (textureCache[def.id]) return textureCache[def.id];

  const canvas = document.createElement('canvas');
  const w = def.width * CELL_SIZE_PHYSICS;
  const h = def.height * CELL_SIZE_PHYSICS;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Clear
  ctx.clearRect(0, 0, w, h);
  
  const baseColor = TW_COLORS[def.color] || '#cccccc';

  def.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === 0) return;

      const cx = c * CELL_SIZE_PHYSICS;
      const cy = r * CELL_SIZE_PHYSICS;
      const size = CELL_SIZE_PHYSICS;
      
      // Visual params matching ItemGridVisual roughly
      const gap = 1;
      const drawX = cx + gap;
      const drawY = cy + gap;
      const drawSize = size - (gap * 2);
      const radius = 3;

      // Draw Rounded Rect manually for max compatibility
      ctx.beginPath();
      ctx.moveTo(drawX + radius, drawY);
      ctx.lineTo(drawX + drawSize - radius, drawY);
      ctx.quadraticCurveTo(drawX + drawSize, drawY, drawX + drawSize, drawY + radius);
      ctx.lineTo(drawX + drawSize, drawY + drawSize - radius);
      ctx.quadraticCurveTo(drawX + drawSize, drawY + drawSize, drawX + drawSize - radius, drawY + drawSize);
      ctx.lineTo(drawX + radius, drawY + drawSize);
      ctx.quadraticCurveTo(drawX, drawY, drawX, drawY + drawSize - radius);
      ctx.lineTo(drawX, drawY + radius);
      ctx.quadraticCurveTo(drawX, drawY, drawX + radius, drawY);
      ctx.closePath();

      // Fill
      ctx.fillStyle = baseColor;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner Highlight/Shadow Effects
      ctx.save();
      ctx.clip(); // Clip to the rounded rect

      // Top Highlight
      const gradTop = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawSize/2);
      gradTop.addColorStop(0, 'rgba(255,255,255,0.3)');
      gradTop.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradTop;
      ctx.fillRect(drawX, drawY, drawSize, drawSize/2);
      
      // Bottom Shadow
      const gradBot = ctx.createLinearGradient(drawX, drawY + drawSize/2, drawX, drawY + drawSize);
      gradBot.addColorStop(0, 'rgba(0,0,0,0)');
      gradBot.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = gradBot;
      ctx.fillRect(drawX, drawY + drawSize/2, drawSize, drawSize/2);

      ctx.restore();
    });
  });

  const url = canvas.toDataURL();
  textureCache[def.id] = url;
  return url;
};

export const PhysicsStaging: React.FC<Props> = ({ onDragStart, itemsToSpawn, onItemsSpawned }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  
  // Keep callback stable for the effect
  const onDragStartRef = useRef(onDragStart);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);

  // Initialize Physics Engine
  useEffect(() => {
    if (!sceneRef.current) return;

    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Mouse = Matter.Mouse;
    const MouseConstraint = Matter.MouseConstraint;
    const Runner = Matter.Runner;
    const Events = Matter.Events;

    const engine = Engine.create();
    engineRef.current = engine;

    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
        showAngleIndicator: false
      }
    });
    renderRef.current = render;

    // Boundaries
    const walls = [
      Bodies.rectangle(width / 2, height + 30, width, 60, { isStatic: true, render: { fillStyle: '#94a3b8' } }), // Floor
      Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true }), // Left
      Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true }), // Right
    ];
    World.add(engine.world, walls);

    // Mouse Interaction
    const mouse = Mouse.create(render.canvas);
    
    // FIX: Matter.js Mouse doesn't detect mouseup if it happens outside the canvas.
    // This causes items to stick to the cursor (drag) when re-entering the canvas.
    // We listen to the global mouseup and force the mouse button state to be released.
    const handleWindowMouseUp = () => {
      mouse.button = -1;
    };
    window.addEventListener('mouseup', handleWindowMouseUp);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });

    World.add(engine.world, mouseConstraint);

    // Handle Picking up items via Physics Events
    // Using 'startdrag' from MouseConstraint ensures we only pick up when the physics engine
    // actively grabs a body, avoiding conflicts with DOM events.
    Events.on(mouseConstraint, 'startdrag', (event: any) => {
      const body = event.body;
      // @ts-ignore
      if (body && body.defId) {
        // Calculate Global Client Coordinates
        // Matter.Mouse.position is relative to the canvas
        const rect = render.canvas.getBoundingClientRect();
        const clientX = mouse.position.x + rect.left;
        const clientY = mouse.position.y + rect.top;

        // Force release the constraint before removing body to avoid errors
        mouseConstraint.constraint.bodyB = null;
        mouseConstraint.body = null;

        // Remove from physics world
        World.remove(engine.world, body);

        // Trigger Application Drag
        // @ts-ignore
        onDragStartRef.current(body.defId, clientX, clientY);
      }
    });

    // Run
    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []); // Only run once on mount

  // Handle Spawning Items
  useEffect(() => {
    if (!engineRef.current || itemsToSpawn.length === 0) return;

    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const width = sceneRef.current?.clientWidth || 300;

    itemsToSpawn.forEach(defId => {
      const def = ITEM_DEFINITIONS[defId];
      if (!def) return;
      
      // Use standard scale for physics world
      const w = def.width * CELL_SIZE_PHYSICS;
      const h = def.height * CELL_SIZE_PHYSICS;
      
      const x = Math.random() * (width - 100) + 50;
      const y = -100 - Math.random() * 200; // Start above screen

      // Generate texture
      const texture = generateItemTexture(def);

      const body = Bodies.rectangle(x, y, w, h, {
        chamfer: { radius: 2 }, // Small chamfer for better physics interaction
        render: {
          sprite: {
             texture: texture,
             xScale: 1, // Texture is generated at exact size
             yScale: 1
          }
        },
        // @ts-ignore
        defId: defId // Store custom data on body
      });
      
      World.add(engineRef.current!.world, body);
    });

    onItemsSpawned();
  }, [itemsToSpawn, onItemsSpawned]);

  return (
    <div className="relative w-full h-full bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300 shadow-inner">
      <div ref={sceneRef} className="absolute inset-0" />
      <div className="absolute top-2 left-2 text-slate-500 text-sm font-semibold select-none pointer-events-none">
        Staging Area (Drag items from here)
      </div>
    </div>
  );
};