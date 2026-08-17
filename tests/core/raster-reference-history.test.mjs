/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo, snapshotRasterReferences } from '../../src/core/history.js';
import { createRasterReferenceEntry } from '../../src/core/history/rasterReferencePatch.js';
import { S } from '../../src/core/state.js';

function guardedA4Grid(onRead) {
  return new Proxy({ length: 3508 }, {
    get(target, property) {
      if (typeof property === 'string' && /^\d+$/.test(property)) onRead();
      return Reflect.get(target, property);
    },
  });
}

function reset() {
  S.W = 2480; S.H = 3508; S.cur = 0;
  S.layers = []; S.folders = []; S.undoStack = []; S.redoStack = [];
  S.marked = new Set(); S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.sel = S.selFloat = S.rotMode = null;
}

describe('raster reference history', () => {
  beforeEach(reset);

  it('captures an A4 layer without reading or cloning any raster row', () => {
    let rasterReads = 0;
    const beforeGrid = guardedA4Grid(() => rasterReads++);
    const beforeExt = new Map([['-1,0', [1, 2, 3, 255]]]);
    const beforeText = { value: 'before' };
    S.layers = [{ kind: 'pixel', grid: beforeGrid, ext: beforeExt,
      text: beforeText, effects: [] }];

    expect(snapshotRasterReferences([0])).toBe(true);
    expect(S.undoStack[0].kind).toBe('raster-reference-patch');
    expect(S.undoStack[0].layers[0].grid.value).toBe(beforeGrid);
    expect(rasterReads).toBe(0);

    const afterGrid = guardedA4Grid(() => rasterReads++);
    const afterExt = new Map([['3,4', [9, 8, 7, 255]]]);
    const afterText = { value: 'after' };
    Object.assign(S.layers[0], { grid: afterGrid, ext: afterExt, text: afterText });

    doUndo();
    expect(S.layers[0].grid).toBe(beforeGrid);
    expect(S.layers[0].ext).toBe(beforeExt);
    expect(S.layers[0].text).toBe(beforeText);
    doRedo();
    expect(S.layers[0].grid).toBe(afterGrid);
    expect(S.layers[0].ext).toBe(afterExt);
    expect(S.layers[0].text).toBe(afterText);
    expect(rasterReads).toBe(0);
  });

  it('rejects an unsupported non-raster layer kind', () => {
    S.layers = [{ kind: 'vector', grid: [], ext: new Map(), effects: [] }];
    expect(createRasterReferenceEntry([0], S)).toBeNull();
    expect(snapshotRasterReferences([0])).toBe(false);
    expect(S.undoStack).toHaveLength(0);
  });
});
