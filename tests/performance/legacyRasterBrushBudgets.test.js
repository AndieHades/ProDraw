/** @vitest-environment jsdom */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUNDLED_BRUSHES } from '../../src/config/bundledBrushes.ts';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { decodeProcreateBrush } from '../../src/core/brush/procreateBrush.ts';
import { visitBrushDab } from '../../src/core/brush/renderBrushDab.ts';
import { newLayer, S } from '../../src/core/state.js';
import { createCellPainter } from '../../src/systems/draw/cells.js';
import { brushStamp } from '../../src/systems/draw/brush.js';
import { line } from '../../src/systems/draw/shapes.js';
import { beginStroke, cancelStroke } from '../../src/systems/draw/stroke.js';

async function bigSoftBrush() {
  const fileName = 'big_soft_brush.brush';
  const preset = BUNDLED_BRUSHES.find((brush) => brush.fileName === fileName);
  if (!preset) throw new Error('Big Soft Brush fixture is unavailable');
  const bytes = await readFile(path.join(process.cwd(), 'src', 'app-folders',
    'brushes', 'main', fileName));
  return decodeProcreateBrush(new Uint8Array(bytes.buffer.slice(
    bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), preset);
}

function prepareLayer() {
  S.W = 800; S.H = 600; S.cur = 0; S.active = [20, 40, 80];
  S.sel = S.selMask = null; S.tile = { on: false };
  S.undoStack = []; S.redoStack = []; S.tool = 'pencil';
  S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.layers = [newLayer('Paint', S.W, S.H)];
}

describe('production raster brush budgets', () => {
  it.each([['pencil', false], ['eraser', true]])(
    'keeps a 64 px %s stamp inside one input slice', (tool, erase) => {
      prepareLayer(); S.tool = tool; S.pencilSize = S.eraserSize = 64;
      if (erase) { const cell = [20, 40, 80, 255];
        for (let y = 250; y < 350; y++) for (let x = 350; x < 450; x++) {
          S.layers[0].grid[y][x] = cell;
        } }
      beginStroke(); const started = performance.now(); brushStamp(400, 300, erase);
      const milliseconds = performance.now() - started; cancelStroke();
      if (process.env.PRODRAW_REPORT_PERF === '1') {
        console.info(`ProductionSimple-${tool}-64`, { milliseconds });
      }
      expect(milliseconds).toBeLessThan(
        PERFORMANCE_BUDGETS.largeSoftDabP50Milliseconds);
    });

  it('batches every stamp from one interpolated pointer move', () => {
    prepareLayer(); S.pencilSize = 64; beginStroke();
    const started = performance.now(); line(380, 300, 420, 300);
    const milliseconds = performance.now() - started; cancelStroke();
    if (process.env.PRODRAW_REPORT_PERF === '1') {
      console.info('ProductionSimple-pencil-64-line', { milliseconds });
    }
    expect(milliseconds).toBeLessThan(
      PERFORMANCE_BUDGETS.largeSoftDabP50Milliseconds);
  });

  it('keeps a large soft dab inside one responsive input slice', async () => {
    const brush = await bigSoftBrush();
    const paint = () => {
      prepareLayer(); beginStroke(); const painter = createCellPainter(false);
      const started = performance.now();
      visitBrushDab(brush, { x: 400, y: 300, pressure: 1, tiltX: 0, tiltY: 0,
        time: 0 }, { size: 160, opacity: 1, erase: false }, painter.paint);
      const visited = performance.now(); painter.flush(); const finished = performance.now();
      cancelStroke(); return { milliseconds: finished - started,
        visitMilliseconds: visited - started, flushMilliseconds: finished - visited };
    };
    paint(); const results = Array.from({ length: 5 }, paint)
      .sort((left, right) => left.milliseconds - right.milliseconds);
    const result = results[Math.floor(results.length / 2)];
    if (process.env.PRODRAW_REPORT_PERF === '1') {
      console.info('ProductionBigSoft-160', result);
    }
    expect(result.milliseconds).toBeLessThan(
      PERFORMANCE_BUDGETS.largeSoftDabP50Milliseconds);
  });

});
