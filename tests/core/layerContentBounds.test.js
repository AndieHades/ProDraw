import { describe, expect, it } from 'vitest';
import { S } from '../../src/core/state.js';
import { dirtyAll, layerContentBounds, markDirty } from '../../src/core/layer-cache.js';

const emptyGrid = (width, height) => Array.from({ length: height }, () => Array(width).fill(null));

describe('legacy layer content bounds cache', () => {
  it('expands partial edits and rescans only after full invalidation', () => {
    const grid = emptyGrid(8, 8); grid[3][2] = [1, 2, 3, 255];
    S.layers = [{ grid, effects: [], ext: new Map() }];
    dirtyAll();
    expect(layerContentBounds(0)).toEqual({ minx: 2, miny: 3, maxx: 2, maxy: 3 });

    grid[6][5] = [4, 5, 6, 255];
    markDirty(0, { minx: 5, miny: 6, maxx: 5, maxy: 6 });
    expect(layerContentBounds(0)).toEqual({ minx: 2, miny: 3, maxx: 5, maxy: 6 });

    grid[3][2] = null; grid[6][5] = null; grid[4][4] = [7, 8, 9, 255];
    markDirty(0);
    expect(layerContentBounds(0)).toEqual({ minx: 4, miny: 4, maxx: 4, maxy: 4 });

    grid[4][4] = null; markDirty(0);
    expect(layerContentBounds(0)).toBeNull();
  });
});
