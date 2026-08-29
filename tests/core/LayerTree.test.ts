import { describe, expect, it } from "vitest";
import { captureEmptyFolderPositions, clearEmptyFolderPositions,
  folderChain, folderInsertionIndex, layersInFolder,
  restoreEmptyFolderPositions } from "../../src/core/layers/LayerTree";
import type { LayerTreeFolder, LayerTreeState } from
  "../../src/core/layers/LayerTree";

describe("typed layer tree", () => {
  it("walks nested groups and rejects corrupt parent cycles", () => {
    const folders: LayerTreeFolder[] = [{ id: 1, parent: null }, { id: 2, parent: 1 },
      { id: 3, parent: 2 }];
    expect(folderChain(folders, 3).map(({ id }) => id)).toEqual([3, 2, 1]);
    folders[0]!.parent = 3;
    expect(folderChain(folders, 3).map(({ id }) => id)).toEqual([3, 2, 1]);
  });

  it("includes hidden-independent descendants in a folder scope", () => {
    const state: LayerTreeState<{ fid?: number | null; visible?: boolean }> = {
      folders: [{ id: 1 }, { id: 2, parent: 1 }],
      layers: [{ fid: null }, { fid: 1, visible: false }, { fid: 2 }] };
    expect(layersInFolder(state, 1)).toEqual(state.layers.slice(1));
  });

  it("preserves an empty nested group insertion anchor", () => {
    const state: LayerTreeState = { folders: [{ id: 1 }, { id: 2, parent: 1 }],
      layers: [{ fid: null }, { fid: 2 }, { fid: null }] };
    const anchors = captureEmptyFolderPositions(state, [1]);
    state.layers.splice(1, 1); restoreEmptyFolderPositions(state, anchors);
    expect(state.folders.map(({ emptyPos }) => emptyPos)).toEqual([1, 1]);
    expect(folderInsertionIndex(state, 2)).toBe(1);
    clearEmptyFolderPositions(state, 2);
    expect(state.folders.map(({ emptyPos }) => emptyPos)).toEqual([undefined, undefined]);
  });
});
