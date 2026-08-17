/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S, blank } from '../../src/core/state.js';
import { captureAdjustmentLayers, writeAdjustmentLayers } from
  '../../src/core/adjustment-preview.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { makeTextLayer } from '../../src/core/text-layer.js';
import { gridBoundsMetadata, setGridBounds } from '../../src/logic/raster.js';
import { beginCanvasReference } from
  '../../src/systems/brightness-contrast/reference.js';
import { createCellPainter } from '../../src/systems/draw/cells.js';
import { floodAt } from '../../src/systems/draw/fill.js';
import { afterStroke, beginStroke, cancelStroke } from
  '../../src/systems/draw/stroke.js';
import { monoTargets } from '../../src/systems/mono.js';
import { recolorAll } from '../../src/systems/recolor.js';
import { fillLayerRefs } from '../../src/systems/layers/fill.js';
import { clearLayerRefs } from '../../src/systems/layers/ops.js';

const A4 = { width: 2480, height: 3508 };
const BOX = { minx: 120, miny: 160, maxx: 135, maxy: 175 };

function context() {
  return { save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, rect() {}, clip() {}, fillText() {},
    measureText: (text) => ({ width: text.length * 8 }),
    getImageData(_x, _y, width, height) { const data = new Uint8ClampedArray(width * height * 4);
      if (data.length) data[3] = 255; return { data, width, height }; } };
}

function textLayer(color = '#ffffff') {
  return makeTextLayer('Text', A4.width, A4.height, { value: 'A', color,
    size: 16, box: { x: BOX.minx, y: BOX.miny, w: 16, h: 16 },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } });
}

function pixelLayer(color = [200, 50, 10, 255]) {
  const grid = blank(1, A4.height); for (const row of grid) row.length = A4.width;
  grid[BOX.miny][BOX.minx] = color;
  setGridBounds(grid, BOX, true);
  return { name: 'Pixel', kind: 'pixel', grid, ext: new Map(), effects: [],
    opacity: 1, visible: true, fid: null, clip: false, lock: false };
}

function reset(layers) {
  S.W = A4.width; S.H = A4.height; S.layers = layers; S.cur = 0;
  S.folders = []; S.undoStack = []; S.redoStack = []; S.marked = new Set();
  S.markedFolders = new Set(); S.fxSel = new Set(); S.fxCur = null;
  S.sel = S.selMask = S.selFloat = S.rotMode = null; S.bgSel = false;
  S.tile = { on: false }; S.active = [20, 30, 40]; S.palette = [];
}

describe('A4 text caller history', () => {
  beforeEach(() => vi.spyOn(globalThis.HTMLCanvasElement.prototype,
    'getContext').mockReturnValue(context()));
  afterEach(() => vi.restoreAllMocks());

  it('cancels and commits rasterization plus brush pixels as one reference', () => {
    const layer = textLayer(), originalGrid = layer.grid, originalText = layer.text;
    reset([layer]); const point = gridBoundsMetadata(layer.grid).bounds;
    beginStroke(); const painter = createCellPainter(false);
    painter.paint(point.minx + 20, point.miny, 1); painter.flush();
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    cancelStroke(); expect(layer.kind).toBe('text'); expect(layer.grid).toBe(originalGrid);
    expect(S.undoStack).toHaveLength(0);

    beginStroke(); const committed = createCellPainter(false);
    committed.paint(point.minx + 20, point.miny, 1); committed.flush();
    S.stroke = false; afterStroke(); const pixelGrid = layer.grid;
    expect(S.undoStack).toHaveLength(1); expect(layer.kind).toBe('pixel');
    doUndo(); expect(layer.kind).toBe('text'); expect(layer.grid).toBe(originalGrid);
    expect(layer.text).toEqual(originalText);
    doRedo(); expect(layer.kind).toBe('pixel'); expect(layer.grid).toBe(pixelGrid);
  });

  it('fills a text layer without a document snapshot', () => {
    const layer = textLayer(), textGrid = layer.grid; reset([layer]);
    const point = gridBoundsMetadata(layer.grid).bounds;
    floodAt(point.minx, point.miny);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(layer.kind).toBe('pixel');
    doUndo(); expect(layer.kind).toBe('text'); expect(layer.grid).toBe(textGrid);
  });

  it('recolors mixed text and raster rows with one copy-on-write entry', () => {
    const text = textLayer(), pixel = pixelLayer([255, 255, 255, 255]);
    const textGrid = text.grid, pixelGrid = pixel.grid, quietRow = pixel.grid[3000];
    reset([text, pixel]); recolorAll([255, 255, 255], [20, 30, 40]);
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('raster-reference-patch');
    expect(text.kind).toBe('pixel'); expect(pixel.grid).not.toBe(pixelGrid);
    expect(pixel.grid[3000]).toBe(quietRow);
    doUndo(); expect(text.kind).toBe('text'); expect(text.grid).toBe(textGrid);
    expect(pixel.grid).toBe(pixelGrid); doRedo(); expect(text.kind).toBe('pixel');
  });

  it('monochrome and canvas adjustment keep reference-backed mixed undo', () => {
    const text = textLayer('#c8320a'), pixel = pixelLayer(); reset([text, pixel]);
    monoTargets([text, pixel]);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(text.kind).toBe('pixel'); doUndo(); expect(text.kind).toBe('text');

    S.undoStack = []; S.redoStack = [];
    const backup = captureAdjustmentLayers();
    expect(beginCanvasReference(backup, [0, 1])).toBe(true);
    writeAdjustmentLayers(backup, { brightness: 50, contrast: 0,
      saturation: 0, hue: 0 });
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('raster-reference-patch');
    expect(text.kind).toBe('pixel'); doUndo(); expect(text.kind).toBe('text');
  });

  it('layer-panel fill and clear keep text conversion reference-backed', () => {
    let text = textLayer('#c8320a'), grid = text.grid; reset([text]);
    expect(fillLayerRefs([text], [7, 8, 9])).toBe(true);
    expect(text.kind).toBe('pixel');
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    doUndo(); expect(text.kind).toBe('text'); expect(text.grid).toBe(grid);

    text = textLayer(); grid = text.grid; reset([text]);
    expect(clearLayerRefs([text])).toBe(true);
    expect(text.kind).toBe('pixel'); expect(gridBoundsMetadata(text.grid).bounds).toBeNull();
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    doUndo(); expect(text.kind).toBe('text'); expect(text.grid).toBe(grid);
  });
});
