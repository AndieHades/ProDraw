import { describe, expect, it } from 'vitest';
import { blank, cloneGrid, conservativeGridBounds, forgetGridBounds,
  gridBounds, noteGridBounds, setGridBounds } from '../../src/logic/raster.js';

describe('legacy grid bounds metadata', () => {
  it('tracks blank and cloned grids without hiding full invalidations', () => {
    const grid = blank(8, 8);
    grid[3][2] = [1, 2, 3, 255];
    expect(noteGridBounds(grid, { minx: 2, miny: 3, maxx: 2, maxy: 3 })).toBe(true);
    const clone = cloneGrid(grid);
    let reads = 0;
    Object.defineProperty(clone[0], 0, {
      configurable: true, get: () => { reads++; return null; },
    });
    expect(gridBounds(clone)).toEqual({ minx: 2, miny: 3, maxx: 2, maxy: 3 });
    expect(reads).toBe(0);

    forgetGridBounds(clone);
    expect(gridBounds(clone)).toEqual({ minx: 2, miny: 3, maxx: 2, maxy: 3 });
    expect(reads).toBe(0); // sparse backing enumerates stored cells, not empty slots
  });

  it('refuses to trust a partial note for an unregistered imported grid', () => {
    const imported = Array.from({ length: 4 }, () => Array(4).fill(null));
    imported[1][1] = [4, 5, 6, 255]; imported[3][3] = [7, 8, 9, 255];
    let reads = 0;
    Object.defineProperty(imported[0], 0, {
      configurable: true, get: () => { reads++; return null; },
    });
    expect(noteGridBounds(imported, { minx: 1, miny: 1, maxx: 1, maxy: 1 })).toBe(false);
    expect(gridBounds(imported)).toEqual({ minx: 1, miny: 1, maxx: 3, maxy: 3 });
    expect(reads).toBeGreaterThan(0); reads = 0;
    expect(gridBounds(imported)).toEqual({ minx: 1, miny: 1, maxx: 3, maxy: 3 });
    expect(reads).toBe(0);
  });

  it('keeps rendering bounds conservative while exact consumers can shrink them', () => {
    const grid = blank(8, 8); grid[6][5] = [1, 2, 3, 255];
    noteGridBounds(grid, { minx: 5, miny: 6, maxx: 5, maxy: 6 });
    expect(gridBounds(grid)).toEqual({ minx: 5, miny: 6, maxx: 5, maxy: 6 });
    grid[6][5] = null;
    noteGridBounds(grid, { minx: 5, miny: 6, maxx: 5, maxy: 6 });
    expect(conservativeGridBounds(grid)).toEqual({ minx: 5, miny: 6, maxx: 5, maxy: 6 });
    expect(gridBounds(grid)).toBeNull();
    expect(conservativeGridBounds(grid)).toBeNull();
  });

  it('registers exact bounds for a copy-on-write outer grid without scanning rows', () => {
    const row = new Array(8).fill(null), grid = new Array(8).fill(row); let reads = 0;
    Object.defineProperty(row, 0, { configurable: true,
      get: () => { reads += 1; return null; } });
    expect(setGridBounds(grid, { minx: 2, miny: 3, maxx: 4, maxy: 5 })).toBe(true);
    expect(gridBounds(grid)).toEqual({ minx: 2, miny: 3, maxx: 4, maxy: 5 });
    expect(reads).toBe(0);
  });
});
