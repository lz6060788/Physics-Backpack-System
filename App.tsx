import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PhysicsStaging } from './components/PhysicsStaging';
import { BackpackGrid } from './components/BackpackGrid';
import { ItemGridVisual } from './components/ItemGridVisual';
import { PlacedItem, DraggingState, CELL_SIZE, GRID_ROWS, GRID_COLS } from './types';
import { ITEM_DEFINITIONS } from './constants';
import { BackpackSystem } from './services/backpackLogic';
import { Trash2, RotateCcw, PackagePlus } from 'lucide-react';

export default function App() {
  // State
  const [backpackItems, setBackpackItems] = useState<PlacedItem[]>([]);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [dragPos, setDragPos] = useState<{x: number, y: number} | null>(null);
  const [spawnQueue, setSpawnQueue] = useState<string[]>([]);

  // Refs needed for logic inside event listeners
  const backpackGridRef = useRef<HTMLDivElement>(null); // To calculate bounds

  // --- Actions ---

  const spawnRandomItems = () => {
    const keys = Object.keys(ITEM_DEFINITIONS);
    const newItems = Array.from({ length: 5 }).map(() => 
      keys[Math.floor(Math.random() * keys.length)]
    );
    setSpawnQueue(prev => [...prev, ...newItems]);
  };

  const handleClear = () => {
    setBackpackItems([]);
  };

  const handleOrganize = () => {
    const sys = new BackpackSystem(GRID_ROWS, GRID_COLS, backpackItems);
    const organized = sys.organize(ITEM_DEFINITIONS);
    setBackpackItems(organized);
  };

  // --- Drag & Drop Logic ---

  const handleDragStartFromStaging = useCallback((defId: string, clientX: number, clientY: number) => {
    setDragging({
      defId,
      source: 'staging',
      offset: { x: CELL_SIZE/2, y: CELL_SIZE/2 } // Center snap for staging items
    });
    setDragPos({ x: clientX, y: clientY });
  }, []);

  const handlePickupFromBackpack = useCallback((instanceId: string, x: number, y: number, clientX: number, clientY: number) => {
    const item = backpackItems.find(i => i.instanceId === instanceId);
    if (!item) return;

    // Remove from backpack temporarily while dragging
    setBackpackItems(prev => prev.filter(i => i.instanceId !== instanceId));

    // Calculate exact offset so the item doesn't "jump" under mouse
    // Mouse relative to Item Top-Left logic needs DOM rect, but we can approximate or calculate:
    // We know the item was at grid (x, y). 
    // We need the screen coordinates of that grid cell to calculate offset.
    // However, simpler is to just capture the current mouse and assume standard offset or calculate later.
    // Let's rely on visual alignment.
    
    // Better way: We don't have the rect handy here easily without refs everywhere.
    // Let's approximate offset to center of the clicked cell within the item? 
    // Or just default to center of the item.
    // Let's try to calculate offset based on click vs grid origin if possible, but for now center is fine.
    
    // Actually, let's keep it simple: 
    // The visual "Drag Layer" will position the item at (dragPos.x - offset.x, dragPos.y - offset.y).
    // We want the item visual to line up with where it was.
    // It's tricky without exact rects. Let's just center it on the mouse for smoother "pickup" feel
    // or calculate rough offset.
    const def = ITEM_DEFINITIONS[item.defId];
    setDragging({
      defId: item.defId,
      instanceId: item.instanceId,
      source: 'backpack',
      originalX: x,
      originalY: y,
      offset: { x: (def.width * CELL_SIZE)/2, y: (def.height * CELL_SIZE)/2 } 
    });
    setDragPos({ x: clientX, y: clientY });
  }, [backpackItems]);

  // Global Mouse Move & Up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        setDragPos({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragging) return;

      // Logic to determine drop
      // 1. Are we over the backpack?
      const backpackEl = document.getElementById('backpack-container');
      
      let dropped = false;

      if (backpackEl) {
        const rect = backpackEl.getBoundingClientRect();
        // Check if mouse is inside backpack area
        if (
          e.clientX >= rect.left && 
          e.clientX <= rect.right && 
          e.clientY >= rect.top && 
          e.clientY <= rect.bottom
        ) {
          // Calculate Grid Drop
          const relX = e.clientX - rect.left - dragging.offset.x;
          const relY = e.clientY - rect.top - dragging.offset.y;
          const gx = Math.round(relX / CELL_SIZE);
          const gy = Math.round(relY / CELL_SIZE);

          const sys = new BackpackSystem(GRID_ROWS, GRID_COLS, backpackItems);
          const def = ITEM_DEFINITIONS[dragging.defId];

          if (sys.canPlaceItem(def, gx, gy)) {
             // Success! Place item.
             const newItem: PlacedItem = {
               instanceId: dragging.instanceId || crypto.randomUUID(),
               defId: dragging.defId,
               x: gx,
               y: gy,
               rotation: 0
             };
             setBackpackItems(prev => [...prev, newItem]);
             dropped = true;
          }
        }
      }

      // If not dropped successfully:
      if (!dropped) {
        if (dragging.source === 'backpack' && dragging.originalX !== undefined && dragging.originalY !== undefined) {
           // Return to original slot
           const returnedItem: PlacedItem = {
             instanceId: dragging.instanceId!,
             defId: dragging.defId,
             x: dragging.originalX,
             y: dragging.originalY,
             rotation: 0
           };
           setBackpackItems(prev => [...prev, returnedItem]);
        } else {
           // Return to staging (spawn physics body back)
           setSpawnQueue(prev => [...prev, dragging.defId]);
        }
      }

      setDragging(null);
      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, backpackItems]);

  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
        <div>
           <h1 className="text-xl font-bold text-emerald-400">BackpackOS <span className="text-slate-500 text-sm font-normal ml-2">v1.0</span></h1>
           <p className="text-xs text-slate-400 mt-1">Physics-based Inventory Management</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={spawnRandomItems}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium transition-colors"
          >
            <PackagePlus size={16} /> Spawn Items
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left: Staging Area */}
        <div className="flex-1 p-6 flex flex-col min-w-[300px] border-r border-slate-700 bg-slate-900/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">Staging Area</h2>
          <div className="flex-1 relative">
            <PhysicsStaging 
              onDragStart={handleDragStartFromStaging}
              itemsToSpawn={spawnQueue}
              onItemsSpawned={() => setSpawnQueue([])}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Drag items from the bin to the backpack. Physics powered by Matter.js.
          </p>
        </div>

        {/* Right: Backpack */}
        <div className="flex-none p-8 w-[600px] flex flex-col items-center justify-center bg-slate-950 shadow-inner">
          <div className="mb-6 flex w-full justify-between items-end px-4">
             <div>
               <h2 className="text-2xl font-bold text-slate-100">Inventory</h2>
               <p className="text-slate-400 text-sm">{backpackItems.length} items stored</p>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={handleOrganize}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700 transition-colors"
                  title="Auto Organize"
                >
                  <RotateCcw size={20} />
                </button>
                <button 
                  onClick={handleClear}
                  className="p-2 bg-slate-800 hover:bg-red-900/30 text-red-400 rounded border border-slate-700 transition-colors"
                  title="Clear All"
                >
                  <Trash2 size={20} />
                </button>
             </div>
          </div>

          <div id="backpack-container">
            <BackpackGrid 
              items={backpackItems} 
              draggingState={dragging} 
              dragPos={dragPos}
              onPickup={handlePickupFromBackpack}
            />
          </div>

          <div className="mt-8 text-slate-500 text-sm">
             Grid: {GRID_ROWS}x{GRID_COLS} • Cell: {CELL_SIZE}px
          </div>
        </div>
      </main>

      {/* Global Drag Layer */}
      {dragging && dragPos && (
        <div 
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - dragging.offset.x,
            top: dragPos.y - dragging.offset.y,
            opacity: 0.9,
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
          }}
        >
          <ItemGridVisual definition={ITEM_DEFINITIONS[dragging.defId]} />
        </div>
      )}
    </div>
  );
}
