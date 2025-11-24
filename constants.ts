import { ItemDefinition } from "./types";

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  'potion': {
    id: 'potion',
    name: 'Health Potion',
    color: 'bg-red-500',
    shape: [
      [1],
      [1]
    ],
    width: 1,
    height: 2
  },
  'sword': {
    id: 'sword',
    name: 'Iron Sword',
    color: 'bg-slate-400',
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    width: 3,
    height: 4
  },
  'shield': {
    id: 'shield',
    name: 'Wooden Shield',
    color: 'bg-amber-600',
    shape: [
      [1, 1],
      [1, 1]
    ],
    width: 2,
    height: 2
  },
  'bow': {
    id: 'bow',
    name: 'Longbow',
    color: 'bg-emerald-600',
    shape: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    width: 2,
    height: 3
  },
  'gem': {
    id: 'gem',
    name: 'Magic Gem',
    color: 'bg-purple-500',
    shape: [
      [1]
    ],
    width: 1,
    height: 1
  },
  'boots': {
    id: 'boots',
    name: 'Leather Boots',
    color: 'bg-yellow-700',
    shape: [
      [1, 1],
      [1, 0]
    ],
    width: 2,
    height: 2
  }
};
