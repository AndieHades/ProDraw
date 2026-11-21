/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { S, newLayer } from '../../src/core/state.ts';
import { trimCanvas } from '../../src/systems/trim.js';
import { createPackedRgbaGrid } from '../../src/logic/raster/PackedRgbaGrid.ts';
import { packedRgbaRecordFromBitmap } from '../../src/logic/raster/packedRgbaRecord.ts';

// 12 МП фото с вычищенным фоном: рисунок в центре и рассыпанные по полю
// полупрозрачные остатки стирания. Анализ пятен не должен ломать бюджет Trim.
it('trims a 12 MP erased photo to its artwork within the trim budget', () => {
  const width = 4000, height = 3000;
  Object.assign(S, { W: width, H: height, cur: 0, layers: [], folders: [],
    animator: null, undoStack: [], redoStack: [], marked: new Set(),
    markedFolders: new Set(), selFolder: null, fxSel: new Set(),
    sel: null, selMask: null, selFloat: null, rotMode: null,
    view: { zoom: 1, ox: 0, oy: 0 } });
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 400; y < 2600; y++) rgba.fill(255, (y * width + 500) * 4, (y * width + 3500) * 4);
  let seed = 7;
  const random = (limit) => { seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % limit; };
  for (let speck = 0; speck < 4000; speck++) {
    const x = random(width), y = random(height);
    if (x >= 490 && x < 3510 && y >= 390 && y < 2610) continue;
    rgba[(y * width + x) * 4 + 3] = 1 + random(120);
  }
  const photo = newLayer('Photo', width, height);
  photo.grid = createPackedRgbaGrid(packedRgbaRecordFromBitmap(width, height,
    { left: 0, top: 0, width, height, rgba }));
  S.layers = [photo];
  const start = performance.now();
  expect(trimCanvas()).toBe(true);
  const trimMs = performance.now() - start;
  if (process.env.PRODRAW_REPORT_PERF) console.log(JSON.stringify({ trimMs }));
  expect([S.W, S.H]).toEqual([3000, 2200]);
  expect(trimMs).toBeLessThan(PERFORMANCE_BUDGETS.canvasTrimMilliseconds);
});
