/** @vitest-environment jsdom */
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BUNDLED_BRUSHES } from '../../src/config/bundledBrushes.ts';
import { newLayer, S } from '../../src/core/state.ts';
import { createCellPainter } from '../../src/systems/draw/cells.js';
import { ensurePresetBrush } from '../../src/systems/draw/preset-brush.ts';
import { beginPresetStroke, pushPresetSample, finishPresetStroke } from '../../src/systems/draw/preset-stroke.ts';
import { beginStroke, afterStroke } from '../../src/systems/draw/stroke.js';
import { StrokePipeline } from '../../src/logic/stroke/StrokePipeline.ts';
import { visitBrushDab } from '../../src/core/brush/renderBrushDab.ts';
import { doUndo, doRedo } from '../../src/core/history.js';

const base = BUNDLED_BRUSHES[0];
const brush = { ...base, shape: { ...base.shape, count: 1, scatter: 0, rotation: 1 },
  taper: { ...base.taper, start: 0.1, end: 0.6, size: 1, opacity: 1 },
  strokePath: { ...base.strokePath, spacing: 0.1 },
  dynamics: { ...base.dynamics, sizeByPressure: 0.6, opacityByPressure: 0.3 } };
const settings = { size: 16, opacity: 0.5, erase: false };
const samples = Array.from({ length: 101 }, (_, i) => ({
  x: 20 + i * 3, y: 48 + Math.sin(i / 9) * 12, pressure: 0.6,
  tiltX: 0, tiltY: 0, time: i * 4, pointerType: 'pen' }));
// Return into an earlier part of the stroke to prove same-stroke overlaps survive repair.
samples.push({ ...samples.at(-1), x: 280, y: 38, time: 430 });
const pixels = () => S.layers[0].grid.map(row => [...row].map(cell => cell?.slice() ?? null));
const prepare = () => {
  S.W = 360; S.H = 100; S.cur = 0; S.active = [20, 30, 40];
  S.layers = [newLayer('Paint', S.W, S.H)]; S.tool = 'pencil';
  S.sel = S.selMask = S.selFloat = null; S.tile = { on: false };
  S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.undoStack = []; S.redoStack = []; beginStroke();
};

beforeAll(async () => {
  const bytes = await readFile('src/app-folders/brushes/main/base_color.brush');
  vi.stubGlobal('fetch', async () => ({ ok: true, arrayBuffer: async () => bytes.buffer.slice(
    bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }));
  await ensurePresetBrush('base_color'); vi.unstubAllGlobals();
});

describe('production end taper repair', () => {
  it.each([[false, 0], [true, 0], [false, 90], [true, 90]])(
    'matches final-plan RGBA and one Undo/Redo with erase=%s, offset=%s', (erase, offset) => {
    const options = { ...settings, erase, bounds: { minx: 0, miny: 0, maxx: 359, maxy: 99 } };
    const path = samples.map(sample => ({ ...sample, x: sample.x + offset }));
    const start = () => {
      prepare();
      if (erase) for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
        S.layers[0].grid[y][x] = [100, 80, 60, 255];
      }
    };
    start();
    const painter = createCellPainter(erase), reset = vi.spyOn(painter, 'reset');
    expect(beginPresetStroke(brush, painter, options)).toBe(true);
    for (const sample of path) { pushPresetSample(sample); painter.flush(); }
    finishPresetStroke(); painter.flush(); S.stroke = false; afterStroke();
    const actual = pixels();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset.mock.calls[0][0].minx).toBeGreaterThan(150);
    expect(reset.mock.calls[0][0].maxx).toBeLessThan(360);
    expect(S.undoStack).toHaveLength(1); doUndo(); doRedo(); expect(pixels()).toEqual(actual);
    start();
    const reference = createCellPainter(erase), pipeline = new StrokePipeline(brush, settings.size);
    path.forEach(sample => pipeline.push(sample)); pipeline.finish();
    for (const dab of pipeline.completedPlan()) visitBrushDab(brush, dab, options, reference.paint);
    reference.flush(); S.stroke = false; afterStroke();
    expect(pixels()).toEqual(actual);
  });
});
