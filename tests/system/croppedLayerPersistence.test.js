/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { getDoc, saveDoc, removeDoc } from '../../src/core/storage.ts';
import { cloneLayersIdle } from '../../src/systems/gallery/record-clone.js';
import { cloneLayer, newLayer } from '../../src/core/layer-record.ts';
import { normalizeLegacyRasterLayer } from '../../src/core/raster/legacyRasterOwner.ts';
import { translateRaster } from '../../src/logic/raster-remap.ts';
import { createPackedRgbaGrid } from '../../src/logic/raster/PackedRgbaGrid.ts';
import { packedRgbaRecordFromBitmap } from '../../src/logic/raster/packedRgbaRecord.ts';

it('saves clipped RGBA rows to IndexedDB and reopens and expands them losslessly', async () => {
  const width = 16, height = 12, bytes = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < bytes.length; i += 4) bytes.set([i % 256, 20, 30, 128], i);
  const layer = newLayer('Image', width, height);
  layer.grid = createPackedRgbaGrid(packedRgbaRecordFromBitmap(width, height,
    { left: 0, top: 0, width, height, rgba: bytes }));
  Object.assign(layer, translateRaster(layer.grid, layer.ext, -6, -4, 4, 4));
  const layers = await cloneLayersIdle([layer], () => undefined, () => true);
  expect(layers[0].ext.format).toBe('rgba-ext-rows-v1');
  await saveDoc({ id: 'compact-crop', kind: 'doc', W: 4, H: 4, layers });
  const record = await getDoc('compact-crop');
  const reopened = normalizeLegacyRasterLayer(record.layers[0], 4, 4);
  expect(reopened.ext.size).toBe(width * height - 16);
  const copy = cloneLayer(reopened);
  copy.ext.set('-6,-4', [1, 2, 3, 4]);
  expect(reopened.ext.get('-6,-4')).toEqual([0, 20, 30, 128]);
  const expanded = translateRaster(reopened.grid, reopened.ext, 6, 4, width, height,
    { preserveGrid: true });
  expect(expanded.ext.size).toBe(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    expect(expanded.grid[y][x]).toEqual([...bytes.subarray(offset, offset + 4)]);
  }
  await removeDoc('compact-crop');
});
