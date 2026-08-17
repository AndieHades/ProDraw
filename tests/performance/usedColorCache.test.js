import { beforeEach, describe, expect, it } from 'vitest';
import { S, blank } from '../../src/core/state.js';
import { dirtyAll, markDirty } from '../../src/core/layer-cache.js';
import { resetUsedColorCache, usedColorKeys } from '../../src/systems/palette-used-colors.js';

describe('used-color cache', () => {
  beforeEach(() => {
    S.W = 64; S.H = 64; S.folders = [];
    S.layers = [{ name: 'Paint', grid: blank(64, 64), opacity: 1, visible: true,
      fid: null, clip: false, kind: 'pixel', effects: [], ext: new Map() }];
    dirtyAll({ preserveGridBounds: true }); resetUsedColorCache();
  });

  it('scans bounded pixels once per layer revision, not once per render', () => {
    S.layers[0].grid[30][20] = [10, 20, 30, 255];
    markDirty(0, { minx: 20, miny: 30, maxx: 20, maxy: 30 });
    let reads = 0; const row = S.layers[0].grid[30];
    S.layers[0].grid[30] = new Proxy(row, { get(target, key, receiver) {
      if (key === '20') reads += 1; return Reflect.get(target, key, receiver);
    } });

    expect([...usedColorKeys()]).toEqual(['10,20,30']);
    const firstReads = reads; expect(firstReads).toBeGreaterThan(0);
    expect([...usedColorKeys()]).toEqual(['10,20,30']);
    expect(reads).toBe(firstReads);

    S.layers[0].grid[30][20] = [40, 50, 60, 255];
    markDirty(0, { minx: 20, miny: 30, maxx: 20, maxy: 30 });
    expect([...usedColorKeys()]).toEqual(['40,50,60']);
    expect(reads).toBeGreaterThan(firstReads);
  });
});
