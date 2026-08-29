import { describe, expect, it } from "vitest";
import { createStructureEntry, inheritStructureIdentity,
  swapStructureEntry } from "../../src/core/history/structurePatch";
import type { StructureState } from
  "../../src/core/history/structurePatchTypes";

const state = (): StructureState => ({
  layers: [{ fid: 2 }, { fid: null }],
  folders: [{ id: 1, parent: null }, { id: 2, parent: 1, emptyPos: 0 }],
  layerSeq: 3, folderSeq: 2, cur: 0, bgSel: false, selFolder: 2,
  marked: new Set([0]), markedFolders: new Set([2]),
  fxSel: new Set(), fxCur: null, fxDraft: null
});

describe("typed structure patch", () => {
  it("restores nested topology and selection without cloning raster owners", () => {
    const value = state(), first = value.layers[0];
    const entry = createStructureEntry(value);
    value.layers.reverse(); value.layers[1]!.fid = null;
    value.folders[1]!.parent = null; delete value.folders[1]!.emptyPos;
    value.cur = 1; value.marked.clear();
    const inverse = swapStructureEntry(entry, value);
    expect(inverse).not.toBeNull(); expect(value.layers[0]).toBe(first);
    expect(value.layers[0]?.fid).toBe(2);
    expect(value.folders[1]).toMatchObject({ parent: 1, emptyPos: 0 });
    expect(value.marked).toEqual(new Set([0]));
  });

  it("preserves identity when a full snapshot replaces a layer clone", () => {
    const value = state(), entry = createStructureEntry(value);
    const clone = inheritStructureIdentity(value.layers[0], { fid: 9 });
    value.layers[0] = clone;
    swapStructureEntry(entry, value);
    expect(value.layers[0]).toBe(clone); expect(clone.fid).toBe(2);
  });
});
