/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo, snapshotCompound } from '../../src/core/history.js';
import { newEffect, newLayer, S } from '../../src/core/state.js';

function reset() {
  S.W = 4; S.H = 4; S.cur = 0;
  S.layers = [newLayer('source', 4, 4)]; S.folders = [];
  S.layers[0].effects = [newEffect('stroke', { size: 1, color: '#ffffff' })];
  S.undoStack = []; S.redoStack = []; S.marked = new Set();
  S.markedFolders = new Set(); S.fxSel = new Set(); S.fxCur = null;
  S.fxDraft = null; S.sel = S.selFloat = S.rotMode = null;
}

describe('compound scoped history', () => {
  beforeEach(reset);

  it('swaps effects before topology on redo and retains raster references', () => {
    const source = S.layers[0], effect = source.effects[0];
    const sourceGrid = source.grid;
    expect(snapshotCompound({ structure: true, effects: [source] })).toBe(true);
    source.effects.splice(0, 1);
    const converted = newLayer('effect', 4, 4); converted.grid[1][1] = [1, 2, 3, 255];
    S.layers.splice(0, 0, converted); S.cur = 0;

    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('compound-patch');
    expect(S.undoStack[0].entries.map((entry) => entry.kind))
      .toEqual(['structure-patch', 'effects-patch']);
    doUndo();
    expect(S.layers).toEqual([source]); expect(source.effects).toEqual([effect]);
    expect(source.grid).toBe(sourceGrid);
    doRedo();
    expect(S.layers).toEqual([converted, source]); expect(source.effects).toEqual([]);
    expect(converted.grid[1][1]).toEqual([1, 2, 3, 255]);
  });
});
