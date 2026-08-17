import { describe, expect, it } from 'vitest';
import { blank, cloneGrid, gridBounds, sparseGridStats } from '../../src/logic/raster.js';

describe('sparse legacy grid compatibility', () => {
  it('preserves indexed Array and serialization behavior without empty slots', () => {
    const grid = blank(4, 3);
    expect(Array.isArray(grid)).toBe(true); expect(grid).toBeInstanceOf(Array);
    expect(sparseGridStats(grid)).toEqual({ width: 4, height: 3,
      materializedRows: 0, contentRows: 0, storedCells: 0, allocatedCells: 0 });
    const row = grid[0];
    expect(Array.isArray(row)).toBe(true); expect(row).toBeInstanceOf(Array);
    expect(row.length).toBe(4); expect(row[0]).toBeNull();
    expect(row.slice()).toEqual([null, null, null, null]);
    expect(row.map((cell) => cell)).toEqual([null, null, null, null]);
    expect(row.some(Boolean)).toBe(false); expect([...row]).toEqual(row.slice());
    expect(JSON.parse(JSON.stringify(grid))).toEqual([
      [null, null, null, null], [null, null, null, null], [null, null, null, null],
    ]);
  });

  it('supports row replacement, resizing, fill and independent sparse clones', () => {
    const grid = blank(1, 2);
    for (const row of grid) row.length = 5;
    grid[1] = new Array(5).fill(null); grid[1][4] = [4, 3, 2, 255];
    grid[0].fill([8, 7, 6, 255], 1, 4);
    expect(Object.keys(grid[0])).toEqual(['1', '2', '3']);
    expect(gridBounds(grid)).toEqual({ minx: 1, miny: 0, maxx: 4, maxy: 1 });
    const clone = cloneGrid(grid);
    expect(clone[0].length).toBe(5); expect(clone[1][4]).toEqual([4, 3, 2, 255]);
    clone[0][1][0] = 99; clone[1][4] = null;
    expect(grid[0][1]).toEqual([8, 7, 6, 255]); expect(grid[1][4]).toEqual([4, 3, 2, 255]);
    grid[0].fill(null); expect(Object.keys(grid[0])).toEqual([]);
    expect(sparseGridStats(grid)).toMatchObject({ storedCells: 1, allocatedCells: 5 });
  });

  it('recomputes exact bounds after direct own-cell erase and farther writes', () => {
    const grid = blank(8, 8);
    grid[2][2] = [1, 2, 3, 255];
    expect(gridBounds(grid)).toEqual({ minx: 2, miny: 2, maxx: 2, maxy: 2 });
    grid[2][2] = null; expect(gridBounds(grid)).toBeNull();
    grid[2][7] = [4, 5, 6, 255];
    expect(gridBounds(grid)).toEqual({ minx: 7, miny: 2, maxx: 7, maxy: 2 });
  });

  it('retains ordinary outer Array slice, iteration and growth semantics', () => {
    const grid = blank(2, 1); grid.push(new Array(2).fill(null));
    expect(grid.length).toBe(2); expect([...grid]).toHaveLength(2);
    expect(grid.slice()).toHaveLength(2);
    grid.splice(0, 1); expect(grid.length).toBe(1); expect(grid[0][0]).toBeNull();
  });
});
