/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo } from '../../src/core/history.js';
import { dirtyAll } from '../../src/core/layer-cache.js';
import { S, blank } from '../../src/core/state.js';
import { mergeCells } from '../../src/logic/raster.js';
import { doMerge } from '../../src/systems/layers/ops.js';

function makeLayer(name, fid = null) {
  return { name, grid: blank(S.W, S.H), opacity: 1, visible: true, fid,
    clip: false, lock: false, alphaLock: false, reference: false,
    ext: new Map(), effects: [], kind: 'pixel' };
}

function reset() {
  S.W = 64; S.H = 64; S.cur = 0; S.layers = []; S.folders = [];
  S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.undoStack = []; S.redoStack = []; S.sel = S.selFloat = null;
}

describe('layer merge exact scoped history', () => {
  beforeEach(reset);

  it('bakes layer effects, clipping and opacity byte-exactly', () => {
    const base = makeLayer('Base'), clip = makeLayer('Clip'); clip.clip = true;
    base.grid[20][20] = [10, 20, 30, 255];
    base.effects = [{ type: 'stroke', visible: true, opacity: 1,
      params: { size: 1, color: '#ffffff' } }];
    clip.grid[20][20] = [110, 70, 210, 128]; clip.grid[2][2] = [9, 9, 9, 255];
    clip.opacity = 0.5; S.layers = [base, clip]; S.cur = 1;
    S.marked = new Set([0, 1]); dirtyAll({ preserveGridBounds: true }); doMerge();
    const merged = S.layers[0];
    expect(merged.grid[20][20]).toEqual(mergeCells([10, 20, 30, 255],
      [110, 70, 210, 128], 0.5));
    expect(merged.grid[2][2]).toBeNull();
    expect(merged.grid[19][20]).toEqual([255, 255, 255, 255]);
    expect(S.undoStack[0].kind).toBe('structure-patch');
    doUndo(); expect(S.layers).toEqual([base, clip]);
    doRedo(); expect(S.layers).toEqual([merged]);
  });

  it('bakes nested folder opacity/effects and restores the tree', () => {
    const root = { id: 1, name: 'Root', parent: null, visible: true,
      opacity: 0.5, effects: [{ type: 'stroke', visible: true, opacity: 1,
        params: { size: 1, color: '#ffffff' } }] };
    const child = { id: 2, name: 'Child', parent: 1, visible: true,
      opacity: 0.5, effects: [] };
    const direct = makeLayer('Direct', 1), nested = makeLayer('Nested', 2);
    direct.grid[10][10] = [200, 0, 0, 255]; nested.grid[30][30] = [0, 200, 0, 255];
    S.folders = [root, child]; S.layers = [direct, nested];
    S.selFolder = 1; S.markedFolders = new Set([1]);
    dirtyAll({ preserveGridBounds: true }); doMerge();
    const merged = S.layers[0];
    expect(merged.grid[10][10]).toEqual([200, 0, 0, 128]);
    expect(merged.grid[30][30]).toEqual([0, 200, 0, 64]);
    expect(merged.grid[9][10]).toEqual([255, 255, 255, 128]);
    doUndo(); expect(S.layers).toEqual([direct, nested]);
    expect(S.folders).toEqual([root, child]);
    doRedo(); expect(S.layers).toEqual([merged]); expect(S.folders).toEqual([]);
  });
});
