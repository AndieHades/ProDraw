/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { S, newLayer } from '../../src/core/state.ts';
import { doUndo, doRedo } from '../../src/core/history.js';
import { trimSelectedLayers } from '../../src/systems/trim.js';
import { cloneLayersIdle } from '../../src/systems/gallery/record-clone.js';
import { createPackedRgbaGrid } from '../../src/logic/raster/PackedRgbaGrid.ts';
import { packedRgbaRecordFromBitmap } from '../../src/logic/raster/packedRgbaRecord.ts';

it.each([1, 6])('trims over %i dense layers and saves without expanding clipped pixels', async (count) => {
  const width = 1600, height = 1200;
  Object.assign(S, { W: width, H: height, cur: 1, layers: [], folders: [],
    animator: null, undoStack: [], redoStack: [], marked: new Set(),
    markedFolders: new Set(), selFolder: null, fxSel: new Set(),
    sel: null, selMask: null, selFloat: null, rotMode: null,
    view: { zoom: 1, ox: 0, oy: 0 } });
  const bytes = new Uint8ClampedArray(width * height * 4); bytes.fill(255);
  const background = newLayer('Large', width, height);
  background.grid = createPackedRgbaGrid(packedRgbaRecordFromBitmap(width, height,
    { left: 0, top: 0, width, height, rgba: bytes }));
  const target = newLayer('Small', width, height);
  target.grid[590][790] = [1, 2, 3, 255];
  target.grid[609][809] = [4, 5, 6, 255];
  S.layers = [background, ...Array.from({ length: count - 1 }, () => {
    const extra = newLayer('Dense', width, height);
    extra.grid = createPackedRgbaGrid(packedRgbaRecordFromBitmap(width, height,
      { left: 0, top: 0, width, height, rgba: bytes }));
    return extra;
  }), target];
  S.cur = count;
  const original = background.grid;
  let start = performance.now();
  expect(trimSelectedLayers()).toBe(true);
  const trimMs = performance.now() - start;
  start = performance.now();
  const stored = await cloneLayersIdle(S.layers, () => undefined, () => true);
  const saveMs = performance.now() - start;
  if (process.env.PRODRAW_REPORT_PERF) console.log(JSON.stringify({ count,
    trimMs, saveMs, outsidePixels: background.ext.size }));
  expect([S.W, S.H]).toEqual([20, 20]);
  expect(background.ext.size).toBe(width * height - 400);
  expect(background.ext.get('-790,-590')).toEqual([255, 255, 255, 255]);
  expect(stored).toHaveLength(count + 1);
  expect(stored[0].ext.format).toBe('rgba-ext-rows-v1');
  expect(stored[0].ext.cells.size).toBe(0);
  expect(stored[0].ext.rows.reduce((sum, row) => sum + row.bytes.byteLength, 0))
    .toBe((width * height - 400) * 4);
  const cropped = background.grid;
  doUndo(); expect(background.grid).toBe(original);
  doRedo(); expect(background.grid).toBe(cropped);
  expect(trimMs).toBeLessThan(PERFORMANCE_BUDGETS.canvasTrimMilliseconds);
  expect(saveMs).toBeLessThan(PERFORMANCE_BUDGETS.changedSerializationMilliseconds);
});
