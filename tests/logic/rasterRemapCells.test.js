import { describe, expect, it } from 'vitest';
import { blank } from '../../src/logic/raster.js';
import { translateRaster } from '../../src/logic/raster-remap.js';

describe('raster remap cell ownership', () => {
  it('reuses immutable imported cells across the grid and ext', () => {
    const grid = blank(4, 3), shared = Object.freeze([10, 20, 30, 255]);
    grid[0][0] = shared; grid[1][1] = shared;
    const result = translateRaster(grid, new Map([['4,2', shared]]), 0, 0, 4, 3,
      { preserveGrid: true });
    expect(result.grid[0][0]).toBe(shared);
    expect(result.grid[1][1]).toBe(shared);
    expect(result.ext.get('4,2')).toBe(shared);
  });

  it('interns equal mutable legacy cells behind a frozen boundary', () => {
    const grid = blank(3, 2), left = [1, 2, 3, 255], right = [1, 2, 3, 255];
    grid[0][0] = left; grid[1][1] = right;
    const result = translateRaster(grid, new Map(), 0, 0, 3, 2);
    expect(result.grid[0][0]).toBe(result.grid[1][1]);
    expect(result.grid[0][0]).not.toBe(left);
    expect(result.grid[1][1]).not.toBe(right);
    expect(Object.isFrozen(result.grid[0][0])).toBe(true);
  });
});
