/** @vitest-environment jsdom */
/* global document */
import { beforeEach, describe, expect, it } from 'vitest';
import { CANVAS_PRESETS } from '../../src/config/canvasPresets.ts';
import { applyCropRect } from '../../src/core/document.js';
import { doUndo } from '../../src/core/history.js';
import { dirtyAll } from '../../src/core/layer-cache.js';
import { S, blank } from '../../src/core/state.js';
import { setGridBounds, sparseGridStats } from '../../src/logic/raster.js';
import { flipLayer } from '../../src/systems/flip.js';
import { centerLayer } from '../../src/systems/layer-center.js';
import { rotateCanvas } from '../../src/systems/rotate-canvas.js';
import { trimCanvas } from '../../src/systems/trim.js';

const A4 = CANVAS_PRESETS.find((preset) => preset.id === 'a4-p');
const area = { minx: 1200, miny: 1700, maxx: 1220, maxy: 1720 };
const rgba = (red) => [red, 2, 3, 255];

function observedGrid() {
  const source = blank(A4.width, A4.height);
  source[1700][1200] = rgba(10); source[1720][1220] = rgba(20);
  let rowReads = 0;
  const grid = new Proxy(source, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) rowReads++;
    return Reflect.get(target, key, receiver);
  } });
  setGridBounds(grid, area, true);
  return { grid, rowReads: () => rowReads };
}

function reset() {
  S.W = A4.width; S.H = A4.height; S.cur = 0; S.folders = [];
  S.animator = null; S.tilesets = []; S.tilesetSeq = 0; S.activeTile = null;
  S.marked = new Set(); S.markedFolders = new Set(); S.fxSel = new Set();
  S.sel = S.selMask = S.selFloat = S.rotMode = null;
  S.undoStack = []; S.redoStack = []; S.view = { zoom: 1, ox: 0, oy: 0 };
  const observed = observedGrid();
  S.layers = [{ name: 'Paint', kind: 'pixel', grid: observed.grid,
    ext: new Map(), effects: [], opacity: 1, visible: true, fid: null }];
  dirtyAll({ preserveGridBounds: true }); return observed;
}

const expectSparse = (limit = 2) => {
  const stats = sparseGridStats(S.layers[0].grid);
  expect(stats.materializedRows).toBeLessThanOrEqual(limit);
  expect(stats.storedCells).toBeLessThanOrEqual(limit);
};

describe('sparse A4 document remaps', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('crops and undoes by references without scanning empty rows', () => {
    const observed = reset(), layer = S.layers[0], before = layer.grid;
    applyCropRect(1190, 1690, 1209, 1709);
    const after = layer.grid;
    expect([S.W, S.H]).toEqual([20, 20]); expect(observed.rowReads()).toBe(2);
    expect(layer.grid[10][10]).toEqual(rgba(10));
    expect(layer.ext.get('30,30')).toEqual(rgba(20)); expectSparse(1);
    expect(S.undoStack.at(-1)?.kind).toBe('document-remap-patch');
    doUndo(); expect(layer.grid).toBe(before); expect([S.W, S.H]).toEqual([A4.width, A4.height]);
    expect(S.redoStack.at(-1)?.layers[0].grid.value).toBe(after);
  });

  it('trims sparse A4 content with the same bounded remap', () => {
    const observed = reset(); trimCanvas();
    expect([S.W, S.H]).toEqual([21, 21]); expect(observed.rowReads()).toBe(2);
    expect(S.layers[0].grid[0][0]).toEqual(rgba(10));
    expect(S.layers[0].grid[20][20]).toEqual(rgba(20)); expectSparse();
  });

  it('rotates sparse A4 content and all history stays reference-backed', () => {
    const observed = reset(), layer = S.layers[0], before = layer.grid;
    rotateCanvas(); const after = layer.grid;
    expect(observed.rowReads()).toBe(2); expect([S.W, S.H]).toEqual([A4.width, A4.height]);
    expect(layer.grid[1714][1293]).toEqual(rgba(10)); expectSparse();
    expect(S.undoStack.at(-1)?.kind).toBe('document-remap-patch');
    doUndo(); expect(layer.grid).toBe(before);
    expect(S.redoStack.at(-1)?.layers[0].grid.value).toBe(after);
  });

  it('flips and centers sparse A4 layers without dense destinations', () => {
    let observed = reset(), layer = S.layers[0]; flipLayer(true);
    expect(observed.rowReads()).toBe(2);
    expect(layer.grid[1700][A4.width - 1 - 1200]).toEqual(rgba(10)); expectSparse();
    expect(S.undoStack.at(-1)?.kind).toBe('raster-reference-patch');

    observed = reset(); layer = S.layers[0]; centerLayer();
    expect(observed.rowReads()).toBe(2); expectSparse();
    expect(layer.grid[1744][1230]).toEqual(rgba(10));
    expect(S.undoStack.at(-1)?.kind).toBe('raster-reference-patch');
  });
});
