/** @vitest-environment jsdom */
/* global document */
import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo } from '../../src/core/history.js';
import { cloneLayer, newLayer, S } from '../../src/core/state.js';
import { sparseGridStats } from '../../src/logic/raster.js';
import { duplicateFolder, duplicateLayer } from '../../src/systems/layers/structure-ops.js';

const W = 2480, H = 3508;

function reset() {
  document.body.innerHTML = '<div id="toast"></div>';
  const painted = newLayer('Paint', W, H), empty = newLayer('Empty', W, H);
  painted.grid[1700][1200] = [1, 2, 3, 255];
  painted.ext.set('-1,1700', [4, 5, 6, 255]);
  painted.fid = 1; empty.fid = 2;
  S.W = W; S.H = H; S.layers = [painted, empty]; S.cur = 0;
  S.folders = [{ id: 1, name: 'Root', parent: null, effects: [] },
    { id: 2, name: 'Child', parent: 1, effects: [] }];
  S.layerSeq = 2; S.folderSeq = 2; S.bgSel = false; S.selFolder = null;
  S.marked = new Set(); S.markedFolders = new Set(); S.fxSel = new Set();
  S.fxCur = S.fxDraft = null; S.undoStack = []; S.redoStack = [];
  S.sel = S.selMask = S.selFloat = S.rotMode = null;
}

describe('sparse layer structure duplication', () => {
  beforeEach(reset);

  it('round-trips an independent sparse layer through structure history', () => {
    const source = S.layers[0]; duplicateLayer(source); const copy = S.layers[1];
    expect(sparseGridStats(copy.grid)).toMatchObject({ contentRows: 1,
      storedCells: 1, allocatedCells: 1 });
    copy.grid[1700][1200][0] = 99; copy.ext.get('-1,1700')[0] = 88;
    expect(source.grid[1700][1200][0]).toBe(1); expect(source.ext.get('-1,1700')[0]).toBe(4);
    expect(S.undoStack.at(-1).kind).toBe('structure-patch');
    doUndo(); expect(S.layers.includes(copy)).toBe(false);
    doRedo(); expect(S.layers[1]).toBe(copy); expect(copy.grid[1700][1200][0]).toBe(99);
  });

  it('duplicates a nested folder without allocating either empty canvas', () => {
    const sourceLayers = [...S.layers]; duplicateFolder(S.folders[0]);
    const copies = S.layers.filter((layer) => !sourceLayers.includes(layer));
    expect(copies).toHaveLength(2);
    expect(sparseGridStats(copies[0].grid)).toMatchObject({ storedCells: 1,
      allocatedCells: 1 });
    expect(sparseGridStats(copies[1].grid)).toMatchObject({ materializedRows: 0,
      storedCells: 0, allocatedCells: 0 });
    const copiedFolders = S.folders.filter((folder) => folder.id > 2);
    expect(copiedFolders).toHaveLength(2);
    expect(copiedFolders[1].parent).toBe(copiedFolders[0].id);
    doUndo(); expect(S.layers).toEqual(sourceLayers); expect(S.folders).toHaveLength(2);
    doRedo(); expect(S.layers.filter((layer) => !sourceLayers.includes(layer))).toEqual(copies);
  });

  it('keeps text fallback payloads independent', () => {
    const text = newLayer('Text', 8, 8); text.kind = 'text';
    text.text = { value: 'A', box: { x: 1, y: 2, w: 3, h: 4 } };
    const textCopy = cloneLayer(text); textCopy.text.box.x = 7;
    expect(text.text.box.x).toBe(1); expect(textCopy.grid).not.toBe(text.grid);
  });
});
