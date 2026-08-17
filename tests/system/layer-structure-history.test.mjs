/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo } from '../../src/core/history.js';
import { newLayer, S } from '../../src/core/state.js';
import { layDrop } from '../../src/systems/layers/lay-drop.js';
import { deleteFolder, deleteLayerRef, doAddLayer, doGroup,
  duplicateLayer, ungroupFolder } from '../../src/systems/layers/ops.js';

function reset() {
  S.W = 4; S.H = 4; S.layerSeq = 3; S.folderSeq = 0;
  S.layers = [newLayer('A', 4, 4), newLayer('B', 4, 4), newLayer('C', 4, 4)];
  S.folders = []; S.cur = 1; S.bgSel = false; S.selFolder = null;
  S.marked = new Set(); S.markedFolders = new Set();
  S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.undoStack = []; S.redoStack = [];
  S.sel = S.selFloat = S.rotMode = null;
}

const layerRow = (index) => ({ dataset: { li: String(index) },
  classList: { contains: () => false } });
const folderRow = (id) => ({ dataset: { fid: String(id) },
  classList: { contains: (name) => name === 'frow' } });

describe('layer structural operations', () => {
  beforeEach(reset);

  it('undoes and redoes add, duplicate and delete without replacing source grids', () => {
    const initial = [...S.layers], grids = initial.map((layer) => layer.grid);
    doAddLayer(); const added = S.layers.at(-1);
    expect(S.undoStack.at(-1).kind).toBe('structure-patch');
    doUndo(); expect(S.layers).toEqual(initial);
    doRedo(); expect(S.layers.at(-1)).toBe(added);

    duplicateLayer(initial[1]); const duplicate = S.layers[2];
    expect(duplicate.grid).not.toBe(grids[1]);
    doUndo(); expect(S.layers.includes(duplicate)).toBe(false);
    doRedo(); expect(S.layers[2]).toBe(duplicate);

    deleteLayerRef(initial[0]); expect(S.layers.includes(initial[0])).toBe(false);
    doUndo(); expect(S.layers[0]).toBe(initial[0]); expect(S.layers[0].grid).toBe(grids[0]);
    doRedo(); expect(S.layers.includes(initial[0])).toBe(false);
  });

  it('round-trips group and ungroup with nested membership intact', () => {
    const initial = [...S.layers]; S.cur = 1; S.marked = new Set([0, 1]);
    doGroup(); const group = S.folders[0];
    expect(group).toBeTruthy(); expect(S.layers.slice(0, 2).every((layer) =>
      layer.fid === group.id)).toBe(true);
    doUndo(); expect(S.folders).toEqual([]); expect(S.layers).toEqual(initial);
    expect(initial.every((layer) => layer.fid === null)).toBe(true);
    doRedo(); expect(S.folders[0]).toBe(group);

    const nested = { id: 2, name: 'nested', parent: group.id, effects: [] };
    S.folders.push(nested); initial[2].fid = nested.id;
    ungroupFolder(group);
    expect(S.folders).toEqual([nested]); expect(nested.parent).toBeNull();
    expect(initial[0].fid).toBeNull(); expect(initial[2].fid).toBe(2);
    doUndo(); expect(S.folders).toEqual([group, nested]);
    expect(nested.parent).toBe(group.id); expect(initial[0].fid).toBe(group.id);
    doRedo(); expect(S.folders).toEqual([nested]); expect(nested.parent).toBeNull();
  });

  it('round-trips layer reorder and folder drag/drop', () => {
    const [a, b, c] = S.layers;
    layDrop({ kind: 'layer', idx: 0 }, layerRow(2), false, false);
    expect(S.layers).toEqual([b, c, a]);
    doUndo(); expect(S.layers).toEqual([a, b, c]);
    doRedo(); expect(S.layers).toEqual([b, c, a]);

    const left = { id: 1, name: 'left', parent: null, effects: [] };
    const right = { id: 2, name: 'right', parent: null, effects: [] };
    S.folders = [left, right]; b.fid = left.id; c.fid = right.id;
    S.markedFolders = new Set([left.id]); S.selFolder = left.id; S.marked.clear();
    layDrop({ kind: 'folder', fid: left.id }, folderRow(right.id), true, false);
    expect(left.parent).toBe(right.id); expect(S.layers).toEqual([c, b, a]);
    doUndo(); expect(left.parent).toBeNull(); expect(S.layers).toEqual([b, c, a]);
    doRedo(); expect(left.parent).toBe(right.id); expect(S.layers).toEqual([c, b, a]);
  });

  it('restores a deleted nested folder tree and every layer object', () => {
    const [a, b, c] = S.layers;
    const root = { id: 1, name: 'root', parent: null, effects: [] };
    const child = { id: 2, name: 'child', parent: 1, effects: [] };
    S.folders = [root, child]; a.fid = 1; b.fid = 2;
    deleteFolder(root); expect(S.layers).toEqual([c]); expect(S.folders).toEqual([]);
    doUndo(); expect(S.layers).toEqual([a, b, c]);
    expect(S.folders).toEqual([root, child]); expect([a.fid, b.fid, child.parent])
      .toEqual([1, 2, 1]);
    doRedo(); expect(S.layers).toEqual([c]); expect(S.folders).toEqual([]);
  });
});
