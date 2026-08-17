/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, blank } from '../../src/core/state.js';
import { doUndo } from '../../src/core/history.js';
import { dirtyAll, markDirty } from '../../src/core/layer-cache.js';
import { gridBoundsMetadata } from '../../src/logic/raster.js';
import {
  beginLiftHistory,
  commitFloat,
  liftSelection,
} from '../../src/systems/selection/float.js';
import { doCopy, doPaste } from '../../src/systems/selection/clipboard.js';

function layer(name, width, height) {
  return { name, kind: 'pixel', grid: blank(width, height), ext: new Map(),
    effects: [], opacity: 1, visible: true, fid: null, clip: false };
}

function reset(width = 8, height = 8, count = 1) {
  S.W = width; S.H = height; S.cur = 0;
  S.layers = Array.from({ length: count }, (_, index) => layer('L' + index, width, height));
  S.folders = []; S.marked = new Set(); S.markedFolders = new Set();
  S.selFolder = null; S.fxCur = null; S.fxSel = new Set();
  S.sel = null; S.selMask = null; S.selFloat = null;
  S.undoStack = []; S.redoStack = [];
  dirtyAll({ preserveGridBounds: true });
}

describe('selection scoped history', () => {
  beforeEach(() => {
    globalThis.document.body.innerHTML = '';
    reset();
  });

  it('moves a floating fragment with copy-on-write raster-reference undo', () => {
    const source = S.layers[0].grid;
    const untouchedRow = source[0];
    source[1][1] = [10, 20, 30, 255];
    markDirty(0, { minx: 1, miny: 1, maxx: 1, maxy: 1 });
    S.sel = { x0: 1, y0: 1, x1: 1, y1: 1 };
    beginLiftHistory();
    liftSelection();
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(Object.is(S.layers[0].grid, source)).toBe(false);
    expect(Object.is(S.layers[0].grid[0], untouchedRow)).toBe(true);
    expect(Object.is(S.layers[0].grid[1], source[1])).toBe(false);
    expect(source[1][1]).toEqual([10, 20, 30, 255]);
    S.selFloat.x = 4; S.selFloat.y = 5;
    commitFloat();
    expect(S.layers[0].grid[5][4]).toEqual([10, 20, 30, 255]);
    S.sel = null; S.selMask = null;
    doUndo();
    expect(Object.is(S.layers[0].grid, source)).toBe(true);
    expect(S.layers[0].grid[1][1]).toEqual([10, 20, 30, 255]);
  });

  it('pastes a bounded layer fragment through structure-reference history', () => {
    reset();
    const source = S.layers[0].grid;
    source[1][1] = [1, 2, 3, 255];
    markDirty(0, { minx: 1, miny: 1, maxx: 1, maxy: 1 });
    doCopy();
    doPaste();
    expect(S.layers).toHaveLength(2);
    expect(Object.is(S.layers[0].grid, source)).toBe(true);
    expect(S.layers[1].grid[1][1]).toEqual([1, 2, 3, 255]);
    expect(gridBoundsMetadata(S.layers[1].grid)).toEqual({
      bounds: { minx: 1, miny: 1, maxx: 1, maxy: 1 }, exact: true,
    });
    expect(S.undoStack.at(-1).kind).toBe('structure-patch');
    doUndo();
    expect(S.layers).toHaveLength(1);
    expect(Object.is(S.layers[0].grid, source)).toBe(true);
  });
});
