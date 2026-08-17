/** @vitest-environment jsdom */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUNDLED_BRUSHES } from '../../src/config/bundledBrushes.ts';
import { beginPixelPatch, cancelPixelPatch } from '../../src/core/history.js';
import { decodeProcreateBrush } from '../../src/core/brush/procreateBrush.ts';
import { visitBrushDab } from '../../src/core/brush/renderBrushDab.ts';
import { newLayer, S } from '../../src/core/state.js';
import { StrokePipeline } from '../../src/logic/stroke/StrokePipeline.ts';
import { createCellPainter } from '../../src/systems/draw/cells.js';

async function bigSoftBrush() {
  const fileName = 'big_soft_brush.brush';
  const preset = BUNDLED_BRUSHES.find((brush) => brush.fileName === fileName);
  if (!preset) throw new Error('Big Soft Brush fixture is unavailable');
  const bytes = await readFile(path.join(globalThis.process.cwd(), 'src', 'app-folders',
    'brushes', 'main', fileName));
  return decodeProcreateBrush(new Uint8Array(bytes.buffer.slice(
    bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), preset);
}

describe('legacy large-brush bridge budgets', () => {
  it('keeps one large soft dab inside a responsive input slice', async () => {
    const brush = await bigSoftBrush();
    S.W = 800; S.H = 600;
    S.cur = 0; S.active = [20, 40, 80]; S.sel = null; S.selMask = null;
    S.tile = { on: false }; S.undoStack = []; S.redoStack = [];
    const paint = (rollback) => { S.layers = [newLayer('Paint', S.W, S.H)];
      beginPixelPatch(); const painter = createCellPainter(false);
      const started = globalThis.performance.now();
      visitBrushDab(brush, { x: 400, y: 300, pressure: 1, tiltX: 0, tiltY: 0,
        time: 0 }, { size: 160, opacity: 1, erase: false }, painter.paint);
      painter.flush(); const elapsed = globalThis.performance.now() - started;
      if (rollback) cancelPixelPatch(); return elapsed; };
    paint(true);
    const milliseconds = paint(false);
    expect(S.layers[0]?.grid[300]?.[400]).not.toBeNull();
    expect(milliseconds).toBeLessThan(50);
    if (globalThis.process.env.PRODRAW_REPORT_PERF === '1') {
      globalThis.console.info('LegacyBigSoft-160', { milliseconds });
    }
    cancelPixelPatch();
  });

  it('does not repaint a large dab for every high-frequency pointer sample', async () => {
    const brush = await bigSoftBrush(), pipeline = new StrokePipeline(brush, 160);
    const samples = Array.from({ length: 81 }, (_, index) => ({ x: 200 + index,
      y: 200, pressure: 1, tiltX: 0, tiltY: 0, time: index * (1000 / 240),
      pointerType: 'pen' }));
    const dabs = [...samples.flatMap((sample) => pipeline.push(sample)),
      ...pipeline.finish()];
    expect(dabs.length).toBeLessThan(10);
    expect(dabs.at(-1)?.x).toBe(280);
  });
});
