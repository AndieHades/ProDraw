/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { CANVAS_PRESETS } from '../../src/config/canvasPresets.ts';
import { doRedo, doUndo } from '../../src/core/history.js';
import { dirtyAll, takeCompositeDamage } from '../../src/core/layer-cache.js';
import { S, blank } from '../../src/core/state.js';
import { mergeCells, setGridBounds, sparseGridStats } from '../../src/logic/raster.js';
import { clearLayerRefs, doMerge } from '../../src/systems/layers/ops.js';

const A4 = CANVAS_PRESETS.find((preset) => preset.id === 'a4-p');
const CONTENT = { minx: 1200, miny: 1700, maxx: 1215, maxy: 1715 };
const EFFECT = { minx: 1192, miny: 1692, maxx: 1223, maxy: 1723 };

function layer(name, grid = blank(S.W, S.H), overrides = {}) {
  return { name, grid, opacity: 1, visible: true, fid: null, clip: false,
    lock: false, alphaLock: false, reference: false, ext: new Map(),
    effects: [], kind: 'pixel', ...overrides };
}

function reset(width = A4.width, height = A4.height) {
  S.W = width; S.H = height; S.cur = 0; S.layers = []; S.folders = [];
  S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.undoStack = []; S.redoStack = []; S.sel = S.selFloat = null;
}

function observedGrid(color, reads) {
  const rows = new Array(S.H);
  for (let y = CONTENT.miny; y <= CONTENT.maxy; y++) {
    rows[y] = new Array(S.W);
    for (let x = CONTENT.minx; x <= CONTENT.maxx; x++) rows[y][x] = color.slice();
  }
  const grid = new Proxy(rows, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) {
      const y = Number(key); reads.rows++;
      if (y < EFFECT.miny || y > EFFECT.maxy) reads.outsideRows++;
    }
    return Reflect.get(target, key, receiver);
  } });
  setGridBounds(grid, CONTENT, true); return grid;
}

describe('bounded layer merge and whole-layer clear', () => {
  beforeEach(() => reset());

  it('merges sparse A4 layers without document scans or a raster snapshot', () => {
    const reads = { rows: 0, outsideRows: 0 };
    const base = layer('Base', observedGrid([40, 50, 60, 255], reads), {
      effects: [{ type: 'stroke', visible: true, opacity: 1,
        params: { size: 8, color: '#ffffff' } }],
    });
    const clip = layer('Clip', observedGrid([120, 80, 200, 180], reads),
      { clip: true, opacity: 0.5 });
    S.layers = [base, clip]; S.cur = 1; S.marked = new Set([0, 1]);
    dirtyAll({ preserveGridBounds: true }); doMerge();

    expect(reads.outsideRows).toBe(0); expect(reads.rows).toBeLessThan(256);
    expect(S.layers).toHaveLength(1); expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('structure-patch');
    const merged = S.layers[0], stats = sparseGridStats(merged.grid);
    expect(stats.materializedRows).toBeLessThanOrEqual(32);
    expect(stats.storedCells).toBeLessThanOrEqual(1024);
    expect(merged.grid[1700][1200]).toEqual(mergeCells(
      [40, 50, 60, 255], [120, 80, 200, 180], 0.5));
    doUndo(); expect(S.layers).toEqual([base, clip]);
    expect(S.layers[0].grid).toBe(base.grid); expect(S.layers[1].grid).toBe(clip.grid);
    doRedo(); expect(S.layers).toEqual([merged]);
  });

  it('swaps one empty sparse A4 reference and restores it exactly', () => {
    const source = blank(S.W, S.H); source[1704][1208] = [1, 2, 3, 200];
    const paint = layer('Paint', source); S.layers = [paint];
    dirtyAll({ preserveGridBounds: true }); takeCompositeDamage();
    expect(clearLayerRefs([paint])).toBe(true);
    const empty = paint.grid; expect(empty).not.toBe(source);
    expect(sparseGridStats(empty)).toMatchObject({ materializedRows: 0,
      storedCells: 0, allocatedCells: 0 });
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('raster-reference-patch');
    expect(takeCompositeDamage()).toEqual({ kind: 'region',
      bounds: { minx: 1208, miny: 1704, maxx: 1208, maxy: 1704 },
      layerIndexes: [0] });
    doUndo(); expect(paint.grid).toBe(source);
    expect(paint.grid[1704][1208]).toEqual([1, 2, 3, 200]);
    doRedo(); expect(paint.grid).toBe(empty);
  });
});
