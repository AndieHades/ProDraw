/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import * as actions from '../../src/core/actions.ts';
import { toolHandler } from '../../src/core/canvas-handlers.ts';
import { doRedo, doUndo } from '../../src/core/history.js';
import { markDirty } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { flipLayer } from '../../src/systems/flip.js';
import '../../src/systems/layer-center.js';
import { symmetrizeLayerRefs } from '../../src/systems/layers/ops.js';
import '../../src/systems/move-tool.js';

const rgba = (red) => [red, 2, 3, 255];

function reset() {
  S.W = 6; S.H = 6; S.cur = 0;
  S.layers = [newLayer('one', 6, 6), newLayer('two', 6, 6)];
  S.folders = []; S.marked = new Set(); S.markedFolders = new Set();
  S.selFolder = null; S.bgSel = false; S.fxSel = new Set(); S.fxCur = null;
  S.fxDraft = null; S.undoStack = []; S.redoStack = [];
  S.sel = S.selMask = S.selFloat = S.rotMode = S.moveDrag = null;
  S.sym = false; S.symH = false; S.tile = { on: false };
}

const expectReferenceEntry = () =>
  expect(S.undoStack.at(-1)?.kind).toBe('raster-reference-patch');

describe('legacy raster transforms use reference history', () => {
  beforeEach(reset);

  it('moves selected pixel layers with exact grid/ext undo and redo', () => {
    const [one, two] = S.layers;
    one.grid[1][1] = rgba(10); one.ext.set('-1,0', rgba(11));
    two.grid[2][2] = rgba(20); S.cur = 1; S.marked = new Set([0]);
    markDirty(0); markDirty(1);
    const before = S.layers.map((layer) => ({ grid: layer.grid, ext: layer.ext }));
    const move = toolHandler('move');
    move.down({ gx: 1, gy: 1 }); move.move({ gx: 3, gy: 2 }); move.up();
    const after = S.layers.map((layer) => ({ grid: layer.grid, ext: layer.ext }));
    expectReferenceEntry(); expect(two.grid[3][4]).toEqual(rgba(20));
    expect(one.grid[1][1]).toEqual(rgba(11));

    doUndo();
    S.layers.forEach((layer, index) => {
      expect(layer.grid).toBe(before[index].grid);
      expect(layer.ext).toBe(before[index].ext);
    });
    doRedo();
    S.layers.forEach((layer, index) => {
      expect(layer.grid).toBe(after[index].grid);
      expect(layer.ext).toBe(after[index].ext);
    });
  });

  it('centers a pixel layer and restores its exact references', () => {
    const layer = S.layers[0]; layer.grid[0][0] = rgba(30); markDirty(0);
    const beforeGrid = layer.grid, beforeExt = layer.ext;
    actions.run('layer.center');
    const afterGrid = layer.grid, afterExt = layer.ext;
    expectReferenceEntry(); expect(layer.grid[3][3]).toEqual(rgba(30));
    doUndo(); expect(layer.grid).toBe(beforeGrid); expect(layer.ext).toBe(beforeExt);
    doRedo(); expect(layer.grid).toBe(afterGrid); expect(layer.ext).toBe(afterExt);
  });

  it('flips every pixel layer and its ext map exactly', () => {
    const [one, two] = S.layers;
    one.grid[1][0] = rgba(40); one.ext.set('-2,1', rgba(41));
    two.grid[2][1] = rgba(50); markDirty(0); markDirty(1);
    const before = S.layers.map((layer) => ({ grid: layer.grid, ext: layer.ext }));
    flipLayer(true);
    const after = S.layers.map((layer) => ({ grid: layer.grid, ext: layer.ext }));
    expectReferenceEntry(); expect(one.grid[1][5]).toEqual(rgba(40));
    expect(one.ext.get('7,1')).toEqual(rgba(41));
    doUndo(); S.layers.forEach((layer, index) => {
      expect(layer.grid).toBe(before[index].grid); expect(layer.ext).toBe(before[index].ext);
    });
    doRedo(); S.layers.forEach((layer, index) => {
      expect(layer.grid).toBe(after[index].grid); expect(layer.ext).toBe(after[index].ext);
    });
  });

  it('symmetrizes selected pixel layers without mutating the saved grids', () => {
    const [one, two] = S.layers;
    one.grid[1][0] = rgba(60); two.grid[2][1] = rgba(70);
    markDirty(0); markDirty(1);
    const before = S.layers.map((layer) => layer.grid);
    symmetrizeLayerRefs(S.layers);
    const after = S.layers.map((layer) => layer.grid);
    expectReferenceEntry(); expect(one.grid[1][5]).toEqual(rgba(60));
    expect(two.grid[2][4]).toEqual(rgba(70));
    doUndo(); S.layers.forEach((layer, index) => expect(layer.grid).toBe(before[index]));
    doRedo(); S.layers.forEach((layer, index) => expect(layer.grid).toBe(after[index]));
  });
});
