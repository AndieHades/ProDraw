/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { doRedo, doUndo, snapshot, snapshotStructure } from '../../src/core/history.js';
import { createStructureEntry } from '../../src/core/history/structurePatch.js';
import { newLayer, S } from '../../src/core/state.js';

const plainLayer = (name, onRead) => {
  const layer = { name, opacity: 1, visible: true, fid: null, effects: [],
    ext: new Map(), kind: 'pixel' };
  Object.defineProperty(layer, 'grid', { configurable: true,
    get: () => { onRead(); return []; } });
  return layer;
};

function reset() {
  S.W = 4; S.H = 4; S.layerSeq = 2; S.folderSeq = 2;
  S.layers = [newLayer('A', 4, 4), newLayer('B', 4, 4)];
  S.folders = [{ id: 1, name: 'root', parent: null, effects: [] },
    { id: 2, name: 'child', parent: 1, effects: [] }];
  S.layers[0].fid = 1; S.layers[1].fid = 2;
  S.cur = 1; S.bgSel = false; S.selFolder = 2;
  S.marked = new Set([0, 1]); S.markedFolders = new Set([2]);
  S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.undoStack = []; S.redoStack = [];
  S.sel = S.selFloat = S.rotMode = null;
}

describe('structural history', () => {
  beforeEach(reset);

  it('swaps topology, membership, sequence and selection by object reference', () => {
    const [a, b] = S.layers, [root, child] = S.folders;
    snapshotStructure();
    const c = newLayer('C', 4, 4); c.fid = null;
    S.layers = [c, b, a]; a.fid = null; b.fid = 1;
    child.parent = null; root.emptyPos = 3;
    S.folders = [child, root]; S.layerSeq = 9; S.folderSeq = 8;
    S.cur = 0; S.bgSel = true; S.selFolder = null;
    S.marked = new Set(); S.markedFolders = new Set();

    expect(S.undoStack[0].kind).toBe('structure-patch');
    expect(S.undoStack[0].layers[0].ref).toBe(a);
    expect(S.undoStack[0].layers[0]).not.toHaveProperty('grid');
    doUndo();
    expect(S.layers).toEqual([a, b]); expect(S.folders).toEqual([root, child]);
    expect([a.fid, b.fid, child.parent]).toEqual([1, 2, 1]);
    expect(Object.hasOwn(root, 'emptyPos')).toBe(false);
    expect([S.layerSeq, S.folderSeq, S.cur, S.bgSel, S.selFolder])
      .toEqual([2, 2, 1, false, 2]);
    expect([...S.marked]).toEqual([0, 1]); expect([...S.markedFolders]).toEqual([2]);

    doRedo();
    expect(S.layers).toEqual([c, b, a]); expect(S.folders).toEqual([child, root]);
    expect([a.fid, b.fid, child.parent, root.emptyPos]).toEqual([null, 1, null, 3]);
    expect([S.layerSeq, S.folderSeq, S.cur, S.bgSel, S.selFolder])
      .toEqual([9, 8, 0, true, null]);
  });

  it('keeps live clones when a full snapshot separates structural undo', () => {
    const removed = S.layers[0], survivor = S.layers[1];
    snapshotStructure(); S.layers.splice(0, 1); S.cur = 0;
    snapshot(); survivor.name = 'mutated after full snapshot';
    doUndo(); const restoredClone = S.layers[0];
    expect(restoredClone).not.toBe(survivor); expect(restoredClone.name).toBe('B');
    doUndo();
    expect(S.layers[0]).toBe(removed); expect(S.layers[1]).toBe(restoredClone);
    doRedo(); expect(S.layers).toEqual([restoredClone]);
  });

  it('keeps A4 structural capture bounded and never reads raster grids', () => {
    let gridReads = 0; S.W = 2480; S.H = 3508;
    S.layers = Array.from({ length: 32 }, (_, index) =>
      plainLayer('A4 layer ' + index, () => gridReads++));
    S.folders = Array.from({ length: 8 }, (_, index) => ({ id: index + 1,
      name: 'folder ' + index, parent: index ? index : null, effects: [] }));
    const durations = [];
    for (let run = 0; run < 30; run++) { const started = globalThis.performance.now();
      const entry = createStructureEntry(S);
      durations.push(globalThis.performance.now() - started);
      expect(entry.layers).toHaveLength(32);
    }
    durations.sort((left, right) => left - right);
    const p95 = durations[Math.floor(durations.length * 0.95)];
    expect(gridReads).toBe(0);
    expect(p95).toBeLessThan(PERFORMANCE_BUDGETS.structuralHistoryP95Milliseconds);
  });
});
