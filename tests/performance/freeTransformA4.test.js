/** @vitest-environment jsdom */
/* global document, HTMLCanvasElement */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as actions from '../../src/core/actions.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { dirtyAll, layerContentBounds, markDirty } from '../../src/core/layer-cache.js';
import { blank, S } from '../../src/core/state.js';
import { SelectionMask } from '../../src/logic/selection-mask.js';
import { enterRotMode, exitRotMode } from '../../src/systems/transform/index.js';

const W = 2480, H = 3508;
const CONTENT = { minx: 1200, miny: 1700, maxx: 1215, maxy: 1715 };
const allocations = [];
const contexts = new WeakMap();

function contextFor(canvas) {
  if (contexts.has(canvas)) return contexts.get(canvas);
  allocations.push({ kind: 'canvas', width: canvas.width, height: canvas.height });
  const context = { canvas, globalAlpha: 1, globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false, drawImage: vi.fn(), putImageData: vi.fn(), clearRect: vi.fn(),
    createImageData: (width, height) => { allocations.push({ kind: 'image', width, height });
      return { data: new Uint8ClampedArray(width * height * 4), width, height }; },
    getImageData: (_x, _y, width, height) => { allocations.push({ kind: 'read', width, height });
      return { data: new Uint8ClampedArray(width * height * 4), width, height }; } };
  contexts.set(canvas, context); return context;
}

function sparseLayer() {
  const grid = blank(0, H); for (const row of grid) row.length = W;
  return { name: 'Paint', kind: 'pixel', grid, ext: new Map(), effects: [], opacity: 1,
    visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false };
}

function reset() {
  document.body.innerHTML = '<canvas id="cv"></canvas><div id="toast"></div>';
  S.W = W; S.H = H; S.cur = 0; S.layers = [sparseLayer()]; S.folders = [];
  S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.bgSel = false; S.fxSel = new Set(); S.fxCur = S.fxDraft = null;
  S.sel = S.selMask = S.selFloat = S.rotMode = S.rotPrev = null;
  S.undoStack = []; S.redoStack = []; S.tool = 'pencil';
  S.sym = S.symH = S.symD1 = S.symD2 = false; S.symEnabled = true;
  S.tile = { on: false }; allocations.length = 0;
  dirtyAll({ preserveGridBounds: true });
}

function paintBlock(layer) {
  for (let y = CONTENT.miny; y <= CONTENT.maxy; y++)
    for (let x = CONTENT.minx; x <= CONTENT.maxx; x++) layer.grid[y][x] = [x & 255, y & 255, 9, 255];
  markDirty(0, CONTENT);
}

function observeCells(grid) {
  const reads = { cells: 0, outside: 0 };
  for (let y = 0; y < H; y++) { const row = grid[y]; grid[y] = new Proxy(row, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) { reads.cells++; const x = +key;
      if (y < CONTENT.miny || y > CONTENT.maxy || x < CONTENT.minx || x > CONTENT.maxx) reads.outside++; }
    return Reflect.get(target, key, receiver); } }); }
  return reads;
}

describe('A4 Free Transform stays content-bounded', () => {
  beforeEach(() => { reset(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function () { return contextFor(this); }); });
  afterEach(() => { if (S.rotMode) exitRotMode(false); vi.restoreAllMocks(); });

  it('does not expand an inverted compact selection or read the empty raster', () => {
    const layer = S.layers[0]; paintBlock(layer); const beforeGrid = layer.grid, beforeExt = layer.ext;
    const reads = observeCells(layer.grid), untouchedRow = layer.grid[0];
    const mask = new SelectionMask(W, H,
      [{ x0: 0, y0: 0, x1: 0, y1: 0 }], true);
    vi.spyOn(SelectionMask.prototype, 'has').mockImplementation(() => { throw new Error('string mask lookup'); });
    vi.spyOn(SelectionMask.prototype, Symbol.iterator).mockImplementation(() => {
      throw new Error('selection expanded'); });
    S.sel = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 }; S.selMask = mask;
    actions.run('transform.enter'); expect(S.rotMode.selection.mask.kind).toBe('compact-selection-mask');
    expect(S.rotMode.b).toEqual({ x0: 0, y0: 0, w: W, h: H });
    expect(S.rotMode.sources[0].srcBounds).toEqual({ minx: CONTENT.minx,
      miny: CONTENT.miny, maxx: CONTENT.maxx, maxy: CONTENT.maxy });
    expect(layer.grid[0]).toBe(untouchedRow); expect(layer.grid[CONTENT.miny]).not.toBe(beforeGrid[CONTENT.miny]);
    expect(S.rotPrev.canvas.width).toBe(16); expect(S.rotPrev.canvas.height).toBe(16);
    expect(reads.outside).toBe(0); expect(reads.cells).toBeLessThan(100000);
    expect(allocations.every(({ width, height }) => width < W && height < H)).toBe(true);
    exitRotMode(false); expect(layer.grid).toBe(beforeGrid); expect(layer.ext).toBe(beforeExt);
  });

  it('applies a sparse selection with exact reference undo and redo', () => {
    const layer = S.layers[0]; paintBlock(layer); layer.ext.set('-1,1700', [7, 8, 9, 255]);
    const beforeGrid = layer.grid, beforeExt = layer.ext;
    S.sel = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
    S.selMask = new SelectionMask(W, H, [{ x0: 0, y0: 0, x1: 0, y1: 0 }], true);
    actions.run('transform.enter'); S.rotMode.tx = 2; S.rotMode.changed = true; exitRotMode(true);
    const afterGrid = layer.grid, afterExt = layer.ext;
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(layer.grid[CONTENT.miny][CONTENT.minx]).toBeNull();
    expect(layer.grid[CONTENT.miny][CONTENT.minx + 2]).toEqual([CONTENT.minx & 255, CONTENT.miny & 255, 9, 255]);
    expect(layerContentBounds(0).maxx).toBeLessThan(W - 1);
    doUndo(); expect(layer.grid).toBe(beforeGrid); expect(layer.ext).toBe(beforeExt);
    doRedo(); expect(layer.grid).toBe(afterGrid); expect(layer.ext).toBe(afterExt);
  });

  it('allocates only transformed content plus the active effect halo', () => {
    const layer = S.layers[0]; paintBlock(layer);
    layer.effects = [{ id: 'stroke', type: 'stroke', visible: true,
      params: { size: 12, color: '#ff7a18' } }];
    enterRotMode(layer);
    expect(S.rotPrev.canvas.width).toBe(40); expect(S.rotPrev.canvas.height).toBe(40);
    expect(allocations.length).toBeGreaterThan(0);
    expect(allocations.every(({ width, height }) => width <= 40 && height <= 40)).toBe(true);
  });

  it('treats a stale conservative bound as an empty layer', () => {
    markDirty(0, CONTENT);
    expect(() => enterRotMode(S.layers[0])).not.toThrow();
    expect(S.rotMode).toBeNull(); expect(allocations).toHaveLength(0);
  });

  it('keeps whole-layer ext pixels in exact reference history', () => {
    const layer = S.layers[0]; layer.grid[1700][1200] = [1, 2, 3, 255];
    layer.ext.set('-1,1700', [4, 5, 6, 255]); markDirty(0, CONTENT);
    const beforeGrid = layer.grid, beforeExt = layer.ext; enterRotMode(layer);
    S.rotMode.tx = 2; S.rotMode.changed = true; exitRotMode(true);
    const afterGrid = layer.grid, afterExt = layer.ext;
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(layer.grid[1700][1202]).toEqual([1, 2, 3, 255]);
    expect(layer.grid[1700][1]).toEqual([4, 5, 6, 255]);
    doUndo(); expect(layer.grid).toBe(beforeGrid); expect(layer.ext).toBe(beforeExt);
    doRedo(); expect(layer.grid).toBe(afterGrid); expect(layer.ext).toBe(afterExt);
  });
});
