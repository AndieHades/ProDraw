/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { folderFx, layerFxSurface, layerMoveCanvas } from '../../src/core/effects-render.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { clippedShift, dirtyAll, layerCanvas } from '../../src/core/layer-cache.js';
import { newEffect, S } from '../../src/core/state.js';
import { setGridBounds } from '../../src/logic/raster.js';
import { convertFxToLayer } from '../../src/systems/effects/convert.js';

const WIDTH = 2480, HEIGHT = 3508;
const created = [], reads = [];
const contexts = new WeakMap();

function contextFor(canvas) {
  if (contexts.has(canvas)) return contexts.get(canvas);
  const context = {
    canvas, globalAlpha: 1, globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false, drawImage: vi.fn(), putImageData: vi.fn(),
    clearRect: vi.fn(), fillRect: vi.fn(),
    createImageData: (width, height) => ({
      data: new Uint8ClampedArray(width * height * 4), width, height,
    }),
    getImageData: (_x, _y, width, height) => {
      reads.push([width, height]);
      return { data: new Uint8ClampedArray(width * height * 4), width, height };
    },
  };
  contexts.set(canvas, context); return context;
}

function sparseGrid(onRow = () => {}) {
  const rows = Array.from({ length: HEIGHT }, () => new Array(WIDTH));
  for (let y = 1700; y < 1716; y++) for (let x = 1200; x < 1216; x++) {
    rows[y][x] = [20, 30, 40, 255];
  }
  const grid = new Proxy(rows, { get(target, property, receiver) {
    if (typeof property === 'string' && /^\d+$/.test(property)) onRow();
    return Reflect.get(target, property, receiver);
  } });
  setGridBounds(grid, { minx: 1200, miny: 1700, maxx: 1215, maxy: 1715 }, true);
  return grid;
}

function reset(grid = sparseGrid()) {
  S.W = WIDTH; S.H = HEIGHT; S.cur = 0;
  S.layers = [{ name: 'A4', grid, opacity: 1, visible: true, fid: null,
    clip: false, lock: false, alphaLock: false, reference: false,
    ext: new Map(), effects: [newEffect('stroke', { size: 8, color: '#ffffff' })],
    kind: 'pixel' }];
  S.folders = []; S.marked = new Set(); S.markedFolders = new Set();
  S.selFolder = null; S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.sel = S.selFloat = S.rotMode = S.moveDrag = null;
  S.undoStack = []; S.redoStack = []; dirtyAll({ preserveGridBounds: true });
}

function warmSource() { layerCanvas(0); created.length = 0; reads.length = 0; }
function expectBounded() {
  expect(created.length).toBeGreaterThan(0);
  expect(created.every((canvas) => canvas.width < 128 && canvas.height < 128)).toBe(true);
  expect(reads.every(([width, height]) => width < 128 && height < 128)).toBe(true);
}

describe('A4 bounded effect surfaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); created.length = 0; reads.length = 0;
    const original = globalThis.document.createElement.bind(globalThis.document);
    vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag, options) => {
      const element = original(tag, options); if (tag === 'canvas') created.push(element);
      return element;
    });
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return contextFor(this);
    });
    reset();
  });

  it('keeps Move, floating selection and folder effect previews local', () => {
    warmSource(); const moved = layerMoveCanvas(0, 17, -9);
    expect(moved.bounds).toEqual({ minx: 1209, miny: 1683, maxx: 1240, maxy: 1714 });
    expectBounded();

    S.layers[0].fid = 1;
    S.folders = [{ id: 1, name: 'Group', parent: null, visible: true,
      opacity: 1, effects: [newEffect('glow', {
        size: 12, intensity: 0.6, color: '#ffffff',
      })] }];
    dirtyAll({ preserveGridBounds: true }); warmSource();
    const folder = folderFx(S.folders[0], 'below');
    expect(folder.bounds).toEqual({ minx: 1180, miny: 1680, maxx: 1235, maxy: 1735 });
    expectBounded();

    S.selFloat = { li: 0, x: 1230, y: 1730, w: 1, h: 1,
      cells: new Map([['0,0', [90, 80, 70, 255]]]) };
    created.length = 0; reads.length = 0;
    const floating = layerFxSurface(0);
    expect(floating.bounds.maxx).toBe(1238); expect(floating.bounds.maxy).toBe(1738);
    expectBounded();
  });

  it('clips shifted sparse layers without an A4 scratch surface', () => {
    S.layers.push({ ...S.layers[0], name: 'Clip', grid: sparseGrid(),
      clip: true, effects: [], ext: new Map() });
    S.layers[0].effects = []; dirtyAll({ preserveGridBounds: true });
    layerCanvas(0); layerCanvas(1); created.length = 0; reads.length = 0;
    const clipped = clippedShift(1, 0, 9, -7, -3, 5);
    expect(clipped.bounds).toEqual({
      minx: 1209, miny: 1705, maxx: 1212, maxy: 1708,
    });
    expectBounded();
  });

  it('converts a sparse A4 effect with bounded reads and one scoped undo', () => {
    let rowReads = 0; reset(sparseGrid(() => rowReads++));
    const source = S.layers[0], effect = source.effects[0];
    convertFxToLayer(source, effect);
    expect(rowReads).toBeLessThanOrEqual(20);
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('compound-patch');
    const converted = S.layers[0]; expect(converted).not.toBe(source);
    expect(converted.grid).toHaveLength(HEIGHT);
    expect(converted.grid[0].length).toBe(WIDTH);
    expect(Object.keys(converted.grid[0])).toHaveLength(0);
    const afterConvertReads = rowReads;
    doUndo(); expect(rowReads - afterConvertReads).toBeLessThanOrEqual(1);
    expect(S.layers).toHaveLength(1); expect(S.layers[0]).toBe(source);
    expect(source.effects).toEqual([effect]);
    const afterUndoReads = rowReads;
    doRedo(); expect(rowReads - afterUndoReads).toBeLessThanOrEqual(1);
    expect(S.layers[0]).toBe(converted); expect(source.effects).toEqual([]);
  });

  it('keeps folder Convert local and restores the folder effect in one undo', () => {
    let rowReads = 0; reset(sparseGrid(() => rowReads++));
    const source = S.layers[0]; source.fid = 7;
    const effect = newEffect('stroke', { size: 9, color: '#ffffff' });
    const folder = { id: 7, name: 'Folder', parent: null, visible: true,
      opacity: 1, effects: [effect] };
    S.folders = [folder]; dirtyAll({ preserveGridBounds: true }); warmSource(); rowReads = 0;
    convertFxToLayer(folder, effect);
    expect(rowReads).toBeLessThanOrEqual(64); expectBounded();
    expect(S.undoStack).toHaveLength(1); expect(S.undoStack[0].kind).toBe('compound-patch');
    expect(S.layers).toHaveLength(2); expect(S.layers[1]).toBe(source);
    doUndo(); expect(S.layers).toHaveLength(1); expect(S.layers[0]).toBe(source);
    expect(S.folders[0]).toBe(folder); expect(folder.effects).toEqual([effect]);
  });
});
