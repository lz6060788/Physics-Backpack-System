import React from 'react';
import { ItemDefinition, CELL_SIZE } from '../types';

interface Props {
  definition: ItemDefinition;
  isGhost?: boolean;
  isValid?: boolean;
}

export const ItemGridVisual: React.FC<Props> = ({ definition, isGhost, isValid = true }) => {
  return (
    <div 
      style={{ 
        width: definition.width * CELL_SIZE, 
        height: definition.height * CELL_SIZE,
        position: 'relative'
      }}
      className="pointer-events-none"
    >
      {definition.shape.map((row, r) => 
        row.map((cell, c) => {
          if (cell === 0) return null;
          
          let bgColor = definition.color;
          if (isGhost) {
            bgColor = isValid ? 'bg-green-400/50' : 'bg-red-400/50';
          }

          return (
            <div
              key={`${r}-${c}`}
              className={`absolute border border-black/20 rounded-sm ${bgColor}`}
              style={{
                width: CELL_SIZE - 2, // slightly smaller for gap effect
                height: CELL_SIZE - 2,
                top: r * CELL_SIZE + 1,
                left: c * CELL_SIZE + 1,
                boxShadow: isGhost ? 'none' : 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)'
              }}
            />
          );
        })
      )}
    </div>
  );
};
