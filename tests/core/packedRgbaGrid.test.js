import { describe, expect, it } from 'vitest';
import { normalizeLegacyRasterLayer, rasterOwnerForLayer } from
  '../../src/core/raster/legacyRasterOwner.ts';
import { packedRgbaRecordFromBitmap } from
  '../../src/logic/raster/packedRgbaRecord.ts';
import { packedRgbaStats } from '../../src/logic/raster/PackedRgbaGrid.ts';
import { cloneGridIdle } from '../../src/systems/gallery/record-clone.js';

const bitmap = () => ({ left: 2, top: 1, width: 3, height: 2,
  rgba: new Uint8ClampedArray([
    10, 20, 30, 255, 0, 0, 0, 0, 40, 50, 60, 128,
    0, 0, 0, 0, 70, 80, 90, 255, 0, 0, 0, 0,
  ]) });

describe('packed RGBA compatibility grid', () => {
  it('keeps direct indexed access and tiled owner history without cell objects', () => {
    const rasterRows = packedRgbaRecordFromBitmap(8, 6, bitmap());
    const layer = normalizeLegacyRasterLayer({ grid: [], rasterRows }, 8, 6);
    const owner = rasterOwnerForLayer(layer);

    expect(layer).not.toHaveProperty('rasterRows');
    expect(layer.grid[1][2]).toEqual([10, 20, 30, 255]);
    expect(layer.grid[1][3]).toBeNull();
    expect(Object.keys(layer.grid[1])).toEqual(['2', '4']);
    expect(owner.readRegion({ minx: 2, miny: 1, maxx: 4, maxy: 2 }, 8, 6)
      .data.some(Boolean)).toBe(true);

    expect(owner.beginRasterEdit('Packed edit', 8, 6)).toBe(true);
    owner.setCell(3, 1, [1, 2, 3, 255]);
    const change = owner.commitRasterEdit(); expect(change).not.toBeNull();
    expect(layer.grid[1][3]).toEqual([1, 2, 3, 255]);
    owner.swapRasterEdit(change, 8, 6);
    expect(layer.grid[1][3]).toBeNull();
  });

  it('serializes compact rows for IndexedDB without materializing every cell', async () => {
    const rasterRows = packedRgbaRecordFromBitmap(8, 6, bitmap());
    const layer = normalizeLegacyRasterLayer({ grid: [], rasterRows }, 8, 6);
    const stored = await cloneGridIdle(layer.grid, undefined, () => true,
      async () => undefined);

    expect(stored).toMatchObject({ format: 'rgba-rows-v1', width: 8, height: 6,
      opaquePixels: 3 });
    expect(globalThis.structuredClone(stored)).toEqual(stored);
    expect(packedRgbaStats(layer.grid)).toMatchObject({ storedCells: 3,
      allocatedCells: 4, materializedRows: 0 });
  });
});
