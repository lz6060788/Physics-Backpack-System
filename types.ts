export type GridMatrix = number[][];

export interface ItemDefinition {
  id: string;
  name: string;
  color: string;
  shape: GridMatrix; // 0/1 matrix defining the shape
  width: number; // calculated from shape
  height: number; // calculated from shape
}

export interface PlacedItem {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270 (Not fully implemented in UI for simplicity, but logic supports it)
}

export interface DraggingState {
  defId: string;
  instanceId?: string; // If dragging from backpack, this is the instance ID
  source: 'backpack' | 'staging';
  offset: { x: number; y: number }; // Offset from mouse cursor to item top-left
  originalX?: number; // If from backpack
  originalY?: number; // If from backpack
}

export const CELL_SIZE = 48; // px
export const GRID_ROWS = 8;
export const GRID_COLS = 8;
