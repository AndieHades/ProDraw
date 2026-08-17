import { describe, expect, it } from 'vitest';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { cloneLayer, newLayer } from '../../src/core/state.js';
import { gridBounds, sparseGridStats } from '../../src/logic/raster.js';

const W = 2480, H = 3508;

describe('A4 sparse layer backing', () => {
  it('allocates no transparent cells for a new empty layer', () => {
    const layer = newLayer('A4', W, H);
    expect(layer.grid.length).toBe(H);
    expect(sparseGridStats(layer.grid)).toEqual({ width: W, height: H,
      materializedRows: 0, contentRows: 0, storedCells: 0, allocatedCells: 0 });
    expect(gridBounds(layer.grid)).toBeNull();
  });

  it('duplicates only sparse content and deep-copies pixel payloads', () => {
    const source = newLayer('A4', W, H);
    source.grid[1700][1200] = [1, 2, 3, 255];
    source.grid[1715][1215] = [4, 5, 6, 128];
    source.ext.set('-1,1700', [7, 8, 9, 200]);
    const copy = cloneLayer(source);
    expect(sparseGridStats(copy.grid)).toEqual({ width: W, height: H,
      materializedRows: 2, contentRows: 2, storedCells: 2, allocatedCells: 2 });
    copy.grid[1700][1200][0] = 99; copy.ext.get('-1,1700')[0] = 88;
    expect(source.grid[1700][1200]).toEqual([1, 2, 3, 255]);
    expect(source.ext.get('-1,1700')).toEqual([7, 8, 9, 200]);
  });

  it('keeps brush-like hot indexed access inside the pointer budget', () => {
    const grid = newLayer('A4', W, H).grid, row = grid[1700];
    for (let x = 0; x < W; x++) row[x] = [x & 255, 2, 3, 255];
    let checksum = 0; const started = globalThis.performance.now();
    for (let index = 0; index < 50000; index++) {
      const x = index % W, cell = grid[1700][x]; checksum += cell[0];
      grid[1700][x] = cell;
    }
    expect(checksum).toBeGreaterThan(0);
    expect(globalThis.performance.now() - started)
      .toBeLessThan(PERFORMANCE_BUDGETS.pointerKernelP95Milliseconds);
  });
});
