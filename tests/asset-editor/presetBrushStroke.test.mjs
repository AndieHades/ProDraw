/** @vitest-environment jsdom */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newLayer, S } from '../../src/core/state.js';
import { rasterOwnerForLayer } from '../../src/core/raster/legacyRasterOwner.ts';
import { brushStamp, endBrushStroke } from '../../src/systems/draw/brush.js';
import { beginStroke } from '../../src/systems/draw/stroke.js';
import { ensurePresetBrush, presetBrush,
  presetShapeId } from '../../src/systems/draw/preset-brush.ts';

const FILE = 'big_soft_brush.brush';
const sample = (x, y, pressure) => ({ x, y, pressure, tiltX: 0, tiltY: 0,
  time: x, pointerType: 'pen' });

function prepare() {
  S.W = 120; S.H = 90; S.cur = 0; S.active = [200, 30, 40];
  S.layers = [newLayer('Paint', S.W, S.H)];
  S.undoStack = []; S.redoStack = []; S.tool = 'pencil';
  S.sel = S.selMask = S.selFloat = null; S.tile = { on: false };
  S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.pencilSize = 40; S.eraserSize = 40;
  S.brushOpacity = { pencil: 1, eraser: 1 };
  S.brushShape = { pencil: 'round', eraser: 'round' };
}

const painted = () => {
  const owner = rasterOwnerForLayer(S.layers[0]);
  const region = owner.readRegion({ minx: 0, miny: 0, maxx: S.W - 1,
    maxy: S.H - 1 }, S.W, S.H);
  let count = 0;
  for (let index = 3; index < region.data.length; index += 4) {
    if (region.data[index]) count += 1;
  }
  return count;
};

describe('preset brush strokes in production', () => {
  beforeEach(async () => {
    prepare();
    const bytes = await readFile(path.join(process.cwd(), 'src', 'app-folders',
      'brushes', 'main', FILE));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength) })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('decodes a bundled preset once and keeps it available synchronously', async () => {
    const first = await ensurePresetBrush('big_soft_brush');
    expect(first).toBeTruthy();
    expect(presetBrush('big_soft_brush')).toBe(first);
    await ensurePresetBrush('big_soft_brush');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('paints a soft footprint that the hard tip would not produce', async () => {
    await ensurePresetBrush('big_soft_brush');
    S.brushShape.pencil = presetShapeId('big_soft_brush');
    beginStroke(); brushStamp(60, 45, false, true, sample(60, 45, 1));
    endBrushStroke();
    const soft = painted();
    expect(soft).toBeGreaterThan(0);

    prepare(); beginStroke(); brushStamp(60, 45, false, true, sample(60, 45, 1));
    endBrushStroke();
    expect(painted()).not.toBe(soft);
  });

  it('reports an unknown preset instead of throwing', async () => {
    expect(await ensurePresetBrush('not-a-brush')).toBeNull();
  });

  it('keeps the hard tip when the asset cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    expect(await ensurePresetBrush('gundersen')).toBeNull();
    expect(S.brushShape.pencil).toBe('round');
  });
});
