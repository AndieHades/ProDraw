/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S } from '../../src/core/state.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { makeTextLayer, updateTextLayerGrid } from '../../src/core/text-layer.js';
import { rasterizeTextAt } from '../../src/core/text-rasterize.js';
import { rasterTextBox } from '../../src/core/text-canvas-raster.js';
import { gridBoundsMetadata } from '../../src/logic/raster.js';
import { captureTextLayer, commitTextLayerEdit } from
  '../../src/systems/text-tool/history.js';

const A4 = { width: 2480, height: 3508 };
const source = (value, color = '#123456') => ({ value, color,
  fontId: 'builtin-system', size: 24, letterSpacing: 0, lineSpacing: 2,
  uppercase: false, align: 'left', box: { x: 120, y: 160, w: 140, h: 48 },
  transform: { x: 3, y: -2, scaleX: 1.1, scaleY: 0.9, rotation: 0.2 } });

function canvasContext(alpha = false) {
  return { save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, rect() {}, clip() {}, fillText() {},
    measureText: (text) => ({ width: text.length * 12 }),
    getImageData: vi.fn((_x, _y, width, height) => {
      const data = new Uint8ClampedArray(width * height * 4);
      if (alpha && data.length) data[3] = 255;
      return { data, width, height };
    }) };
}

function guardedGrid(onRead) {
  return new Proxy({ length: A4.height }, { get(target, property) {
    if (typeof property === 'string' && /^\d+$/.test(property)) onRead();
    return Reflect.get(target, property);
  } });
}

function resetHistory() {
  S.W = A4.width; S.H = A4.height; S.cur = 0; S.layers = []; S.folders = [];
  S.undoStack = []; S.redoStack = []; S.marked = new Set();
  S.markedFolders = new Set(); S.fxSel = new Set(); S.fxCur = null;
  S.sel = S.selFloat = S.rotMode = null;
}

describe('A4 text performance boundaries', () => {
  beforeEach(resetHistory);
  afterEach(() => vi.restoreAllMocks());

  it('allocates ImageData only for the transformed local text box', () => {
    const context = canvasContext();
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const raster = rasterTextBox(source('Tiny'), A4.width, A4.height);
    expect(raster).not.toBeNull();
    const [, , width, height] = context.getImageData.mock.calls[0];
    expect(width * height).toBeLessThan((A4.width * A4.height) / 100);
    expect([width, height]).toEqual([raster.bounds.width, raster.bounds.height]);
  });

  it('maps the bounded alpha result into the canonical legacy grid', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(canvasContext(true));
    const layer = makeTextLayer('Tiny', 320, 240, source('Tiny'));
    const raster = rasterTextBox(layer.text, 320, 240);
    expect(layer.grid).toHaveLength(240); expect(layer.grid[0]).toHaveLength(320);
    expect(layer.grid[raster.bounds.y][raster.bounds.x]).toEqual([18, 52, 86, 255]);
  });

  it('creates an A4 text grid with shared blank rows and local writable rows', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(canvasContext(true));
    const layer = makeTextLayer('Tiny', A4.width, A4.height, source('Tiny'));
    const raster = rasterTextBox(layer.text, A4.width, A4.height);
    expect(layer.grid).toHaveLength(A4.height);
    expect(layer.grid[0]).toHaveLength(A4.width);
    expect(layer.grid[1000]).toBe(layer.grid[3000]);
    expect(new Set(layer.grid).size).toBeLessThan(200);
    expect(layer.grid[raster.bounds.y][raster.bounds.x])
      .toEqual([18, 52, 86, 255]);
  });

  it('copy-on-writes only damaged A4 rows and keeps the previous grid immutable', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(canvasContext(true));
    let blankReads = 0; const sharedRow = new Array(A4.width);
    Object.defineProperty(sharedRow, 0, { configurable: true,
      get: () => { blankReads += 1; return null; } });
    const previous = new Array(A4.height).fill(sharedRow);
    const oldRow = new Array(A4.width); oldRow[125] = [9, 8, 7, 255];
    const unrelatedRow = new Array(A4.width); unrelatedRow[2100] = [1, 2, 3, 255];
    previous[165] = oldRow; previous[3000] = unrelatedRow;
    const layer = { kind: 'text', name: 'Tiny', text: source('Changed'),
      grid: previous, ext: new Map(), effects: [] };
    updateTextLayerGrid(layer, A4.width, A4.height);
    const changedRows = layer.grid.reduce((count, row, index) =>
      count + Number(row !== previous[index]), 0);
    expect(changedRows).toBeGreaterThan(0); expect(changedRows).toBeLessThan(200);
    expect(layer.grid[3000]).toBe(unrelatedRow);
    expect(layer.grid[3000][2100]).toEqual([1, 2, 3, 255]);
    expect(blankReads).toBeLessThan(200);
    expect(previous[165]).toBe(oldRow); expect(previous[165][125])
      .toEqual([9, 8, 7, 255]);
  });

  it('captures no target or unrelated raster rows and restores text exactly', () => {
    let reads = 0;
    const beforeGrid = guardedGrid(() => reads++), afterGrid = guardedGrid(() => reads++);
    const otherGrid = guardedGrid(() => reads++), beforeExt = new Map(), afterExt = new Map();
    const layer = { kind: 'text', name: 'Before', text: source('Before'),
      grid: beforeGrid, ext: beforeExt, effects: [] };
    S.layers = [layer, { kind: 'pixel', name: 'Other', grid: otherGrid,
      ext: new Map(), effects: [] }];
    const original = captureTextLayer(layer);
    Object.assign(layer, { name: 'After', text: source('After', '#abcdef'),
      grid: afterGrid, ext: afterExt });
    expect(commitTextLayerEdit(layer, 0, original)).toBe(true);
    expect(reads).toBe(0); expect(S.undoStack.at(-1)?.kind)
      .toBe('raster-reference-patch');
    doUndo();
    expect(layer).toMatchObject({ name: 'Before', text: source('Before') });
    expect(layer.grid).toBe(beforeGrid); expect(layer.ext).toBe(beforeExt);
    doRedo();
    expect(layer).toMatchObject({ name: 'After', text: source('After', '#abcdef') });
    expect(layer.grid).toBe(afterGrid); expect(layer.ext).toBe(afterExt);
    expect(reads).toBe(0);
  });

  it('swaps exact text and pixel references around explicit rasterization', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(canvasContext(true));
    const layer = makeTextLayer('Tiny', A4.width, A4.height, source('Tiny'));
    const textGrid = layer.grid, text = layer.text; S.layers = [layer];
    expect(rasterizeTextAt(0, { history: true })).toBe(true);
    const pixelGrid = layer.grid;
    expect(layer.kind).toBe('pixel'); expect(layer.text).toBeUndefined();
    expect(pixelGrid[0]).not.toBe(pixelGrid[3000]);
    expect(gridBoundsMetadata(pixelGrid)?.exact).toBe(true);
    doUndo(); expect(layer.kind).toBe('text'); expect(layer.grid).toBe(textGrid);
    expect(layer.text).toEqual(text);
    doRedo(); expect(layer.kind).toBe('pixel'); expect(layer.grid).toBe(pixelGrid);
    expect(layer.text).toBeUndefined();
  });
});
