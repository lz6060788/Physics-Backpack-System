import React, { useRef, useMemo } from 'react';
import { CELL_SIZE, GRID_ROWS, GRID_COLS, PlacedItem, DraggingState } from '../types';
import { ITEM_DEFINITIONS } from '../constants';
import { BackpackSystem } from '../services/backpackLogic';
import { ItemGridVisual } from './ItemGridVisual';

interface Props {
  items: PlacedItem[];
  draggingState: DraggingState | null;
  dragPos: { x: number, y: number } | null;
  onPickup: (itemId: string, x: number, y: number, clientX: number, clientY: number) => void;
}

export const BackpackGrid: React.FC<Props> = ({ items, draggingState, dragPos, onPickup }) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Helper to determine where the dragged item would snap to
  const snapPosition = useMemo(() => {
    if (!draggingState || !dragPos || !gridRef.current) return null;

    const rect = gridRef.current.getBoundingClientRect();
    
    // Calculate raw grid coords relative to mouse
    // DragPos is the Mouse Position. 
    // We need to account for the item's offset (where we grabbed it).
    // draggingState.offset is (MouseX - ItemLeft, MouseY - ItemTop)
    
    const rawLeft = dragPos.x - draggingState.offset.x - rect.left;
    const rawTop = dragPos.y - draggingState.offset.y - rect.top;

    const gridX = Math.round(rawLeft / CELL_SIZE);
    const gridY = Math.round(rawTop / CELL_SIZE);

    return { gridX, gridY };
  }, [draggingState, dragPos]);

  // Determine validity of snap position
  const isValidPlacement = useMemo(() => {
    if (!snapPosition || !draggingState) return false;
    const sys = new BackpackSystem(GRID_ROWS, GRID_COLS, items);
    const def = ITEM_DEFINITIONS[draggingState.defId];
    // Ignore the item being dragged if it came from the backpack (it's already 'removed' from state in App usually, but if not, logic handles it)
    return sys.canPlaceItem(def, snapPosition.gridX, snapPosition.gridY, draggingState.instanceId);
  }, [snapPosition, draggingState, items]);

  return (
    <div 
      ref={gridRef}
      className="relative bg-slate-800 rounded-lg shadow-xl border-4 border-slate-700"
      style={{ 
        width: GRID_COLS * CELL_SIZE + 8, // +8 for border/padding adjustment if needed
        height: GRID_ROWS * CELL_SIZE + 8,
        padding: 4
      }}
    >
      {/* Grid Background Lines */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          left: 4, top: 4, right: 4, bottom: 4
        }}
      />

      {/* Placed Items */}
      {items.map(item => {
        const def = ITEM_DEFINITIONS[item.defId];
        return (
          <div
            key={item.instanceId}
            onMouseDown={(e) => {
              e.stopPropagation();
              onPickup(item.instanceId, item.x, item.y, e.clientX, e.clientY);
            }}
            className="absolute cursor-grab active:cursor-grabbing hover:brightness-110 transition-filter"
            style={{
              left: item.x * CELL_SIZE + 4,
              top: item.y * CELL_SIZE + 4,
              width: def.width * CELL_SIZE,
              height: def.height * CELL_SIZE,
              zIndex: 10
            }}
          >
            <ItemGridVisual definition={def} />
          </div>
        );
      })}

      {/* Ghost Item (Drop Preview) */}
      {draggingState && snapPosition && (
        <div
          className="absolute pointer-events-none transition-all duration-75"
          style={{
            left: snapPosition.gridX * CELL_SIZE + 4,
            top: snapPosition.gridY * CELL_SIZE + 4,
            zIndex: 20,
            opacity: 0.8
          }}
        >
          <ItemGridVisual 
            definition={ITEM_DEFINITIONS[draggingState.defId]} 
            isGhost={true} 
            isValid={isValidPlacement} 
          />
        </div>
      )}
    </div>
  );
};
