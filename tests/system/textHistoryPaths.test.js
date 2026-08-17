/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S, blank } from '../../src/core/state.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { makeTextLayer } from '../../src/core/text-layer.js';
import { rasterizeMatchingText } from '../../src/core/text-rasterize.js';
import { applyTextChange, snapshotTextChange } from
  '../../src/systems/font-library/text-change.js';
import { configureFrame, frameHandler } from '../../src/systems/text-tool/frame.js';
import { insertTextLayer } from '../../src/systems/text-tool/layer-ops.js';

const source = (value = 'Text') => ({ value, fontId: 'builtin-system', size: 12,
  color: '#123456', letterSpacing: 0, lineSpacing: 2, uppercase: false,
  align: 'left', box: { x: 10, y: 10, w: 40, h: 20 },
  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } });

function context() {
  return { save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, rect() {}, clip() {}, fillText() {},
    measureText: (text) => ({ width: text.length * 6 }),
    getImageData(_x, _y, width, height) {
      const data = new Uint8ClampedArray(width * height * 4);
      if (data.length) data[3] = 255; return { data, width, height };
    } };
}

function reset() {
  S.W = 80; S.H = 60; S.cur = 0; S.layers = [{ kind: 'pixel', name: 'Base',
    grid: blank(80, 60), ext: new Map(), effects: [], fid: null }];
  S.folders = []; S.undoStack = []; S.redoStack = []; S.layerSeq = 1;
  S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.fxSel = new Set(); S.fxCur = null; S.bgSel = false;
  S.sel = S.selFloat = S.rotMode = null; S.tool = 'text';
  S.view = { zoom: 1, ox: 0, oy: 0 };
}

describe('text scoped history paths', () => {
  beforeEach(() => { reset(); vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context()); });
  afterEach(() => vi.restoreAllMocks());

  it('creates a text layer with one structure entry', () => {
    const layer = insertTextLayer('Text', source(''));
    expect(layer.kind).toBe('text'); expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('structure-patch');
    doUndo(); expect(S.layers).toHaveLength(1);
    doRedo(); expect(S.layers.at(-1)).toBe(layer);
  });

  it('coalesces a font or color slider gesture into one raster reference', () => {
    const layer = makeTextLayer('Text', 80, 60, source());
    S.layers = [layer]; S.undoStack = []; S.redoStack = [];
    expect(snapshotTextChange(layer)).toBe(true);
    applyTextChange(layer, { size: 20 }, [], false);
    applyTextChange(layer, { size: 24, color: '#abcdef' }, [], false);
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('raster-reference-patch');
    doUndo(); expect(layer.text).toMatchObject({ size: 12, color: '#123456' });
    doRedo(); expect(layer.text).toMatchObject({ size: 24, color: '#abcdef' });
  });

  it('records a frame drag once and restores its exact box', () => {
    const layer = makeTextLayer('Text', 80, 60, source());
    S.layers = [layer]; S.undoStack = []; S.redoStack = [];
    configureFrame({ source: () => layer.text, layer: () => layer,
      fonts: () => [], place() {}, editing: () => false });
    const before = { ...layer.text.box }, middleY = before.y + before.h / 2;
    expect(frameHandler.down({ gx: before.x, gy: middleY })).toBe(true);
    frameHandler.move({ gx: before.x + 5, gy: middleY }); frameHandler.up();
    expect(S.undoStack).toHaveLength(1);
    expect(layer.text.box).toEqual({ ...before, x: before.x + 5, w: before.w - 5 });
    doUndo(); expect(layer.text.box).toEqual(before);
    doRedo(); expect(layer.text.box)
      .toEqual({ ...before, x: before.x + 5, w: before.w - 5 });
  });

  it('rasterizes multiple text layers through one reversible reference entry', () => {
    const first = makeTextLayer('First', 80, 60, source('First'));
    const second = makeTextLayer('Second', 80, 60, source('Second'));
    S.layers = [first, second]; S.undoStack = []; S.redoStack = [];
    expect(rasterizeMatchingText(() => true, { history: true })).toBe(true);
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].layers).toHaveLength(2);
    expect(S.layers.every((layer) => layer.kind === 'pixel')).toBe(true);
    doUndo(); expect(S.layers.every((layer) => layer.kind === 'text')).toBe(true);
    doRedo(); expect(S.layers.every((layer) => layer.kind === 'pixel')).toBe(true);
  });
});
