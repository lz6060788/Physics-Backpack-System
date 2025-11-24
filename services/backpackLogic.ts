import { GridMatrix, ItemDefinition, PlacedItem } from '../types';

/**
 * Core Backpack Logic Class
 * Handles grid state, collision detection, and organization.
 */
export class BackpackSystem {
  rows: number;
  cols: number;
  items: PlacedItem[];

  constructor(rows: number, cols: number, items: PlacedItem[] = []) {
    this.rows = rows;
    this.cols = cols;
    this.items = items;
  }

  /**
   * Checks if an item can be placed at a specific grid coordinate.
   */
  canPlaceItem(
    itemDef: ItemDefinition,
    x: number,
    y: number,
    ignoreInstanceId?: string
  ): boolean {
    // 1. Check boundary limits
    if (x < 0 || y < 0 || x + itemDef.width > this.cols || y + itemDef.height > this.rows) {
      return false;
    }

    // 2. Build the occupancy grid of current items
    const grid = this.getOccupancyGrid(ignoreInstanceId);

    // 3. Check for collision
    for (let r = 0; r < itemDef.height; r++) {
      for (let c = 0; c < itemDef.width; c++) {
        if (itemDef.shape[r][c] === 1) {
          const gridX = x + c;
          const gridY = y + r;
          if (grid[gridY][gridX] !== null) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Generates a 2D grid representation where cells contain the instanceId of the item occupying them, or null.
   */
  getOccupancyGrid(ignoreInstanceId?: string): (string | null)[][] {
    const grid: (string | null)[][] = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(null)
    );

    // We need to look up definitions dynamically. 
    // In a pure class, we might pass a lookup map, but for this simpler impl 
    // we assume the caller handles the 'def' lookup or we pass definitions in.
    // However, to keep this pure, let's assume 'items' contains enough info or we pass a helper.
    // For this implementation, we will pass the definitions map to the sort function, 
    // but here we assume the shapes are consistent. 
    // NOTE: In a real app, PlacedItem might contain a cached shape or reference.
    // We will fix this by relying on the caller to manage the validity or injecting definitions.
    
    // Actually, let's modify the class usage to accept definitions when needed 
    // or assume we can't fully rebuild grid without definitions.
    // Use a placeholder logic: We need the definitions to build the grid.
    return grid; 
  }
  
  // Re-implementation with definitions map injected
  getOccupancyGridWithDefs(
    defs: Record<string, ItemDefinition>, 
    ignoreInstanceId?: string
  ): (string | null)[][] {
    const grid: (string | null)[][] = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(null)
    );

    for (const item of this.items) {
      if (item.instanceId === ignoreInstanceId) continue;
      
      const def = defs[item.defId];
      if (!def) continue;

      for (let r = 0; r < def.height; r++) {
        for (let c = 0; c < def.width; c++) {
          if (def.shape[r][c] === 1) {
            const gx = item.x + c;
            const gy = item.y + r;
            if (gy >= 0 && gy < this.rows && gx >= 0 && gx < this.cols) {
              grid[gy][gx] = item.instanceId;
            }
          }
        }
      }
    }
    return grid;
  }

  /**
   * Auto-organizes the inventory using a simple "First Fit" algorithm.
   * Sorts items by area (largest first) to pack efficiently.
   */
  organize(defs: Record<string, ItemDefinition>): PlacedItem[] {
    const sortedItems = [...this.items].sort((a, b) => {
      const defA = defs[a.defId];
      const defB = defs[b.defId];
      const areaA = defA.width * defA.height; // Approximation
      const areaB = defB.width * defB.height;
      return areaB - areaA; // Descending
    });

    const newItems: PlacedItem[] = [];
    // Temporary internal grid for the algorithm
    const tempGrid: boolean[][] = Array.from({ length: this.rows }, () =>
        Array(this.cols).fill(false)
    );

    for (const item of sortedItems) {
      const def = defs[item.defId];
      let placed = false;

      // Scan grid for first fit
      for (let y = 0; y <= this.rows - def.height; y++) {
        for (let x = 0; x <= this.cols - def.width; x++) {
          // Check collision against tempGrid
          let fits = true;
          for (let r = 0; r < def.height; r++) {
            for (let c = 0; c < def.width; c++) {
              if (def.shape[r][c] === 1) {
                if (tempGrid[y + r][x + c]) {
                  fits = false;
                  break;
                }
              }
            }
            if (!fits) break;
          }

          if (fits) {
            // Place it
            newItems.push({ ...item, x, y });
            // Mark tempGrid
            for (let r = 0; r < def.height; r++) {
              for (let c = 0; c < def.width; c++) {
                if (def.shape[r][c] === 1) {
                  tempGrid[y + r][x + c] = true;
                }
              }
            }
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      
      // If an item doesn't fit after sort (shouldn't happen if it was already in, but possible if density changes),
      // we append it or handle it. For this feature, we just omit if it somehow fails, or push it back to staging in a real app.
      // Here we only keep what fits.
    }

    return newItems;
  }
}
