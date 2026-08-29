import { describe, expect, it } from "vitest";
import { selectLayer, type LayerCommandState } from
  "../../src/core/layers/LayerCommandState.ts";
import { setOpacity, toggleExclusiveReference, toggleLayerFlag,
  toggleVisibleChain } from "../../src/core/layers/LayerMetadataCommands.ts";
import { insertLayer, moveFolderBlock,
  moveLayerBlock } from "../../src/core/layers/LayerStructureCommands.ts";

const state = (): LayerCommandState => ({
  layers: [{ fid: null }, { fid: null }, { fid: null }],
  folders: [], cur: 0, bgSel: true, selFolder: 4,
  marked: new Set([1]), markedFolders: new Set([4]),
  fxSel: new Set([{}]), fxCur: {}
});

describe("typed layer commands", () => {
  it("owns selection and base metadata mutations", () => {
    const value = state(), layer = value.layers[1];
    expect(layer && selectLayer(value, 1)).toBe(true);
    expect(value).toMatchObject({ cur: 1, bgSel: false, selFolder: null,
      fxCur: null });
    expect(value.marked.size + value.markedFolders.size + value.fxSel.size).toBe(0);
    if (!layer) throw new Error("Missing fixture layer");
    expect(toggleLayerFlag(layer, "lock")).toBe(true);
    expect(setOpacity(layer, 4)).toBe(1);
    expect(toggleExclusiveReference(value, layer)).toBe(true);
    expect(value.layers.map((item) => item.reference)).toEqual([false, true, false]);
    const parent = { visible: false }; layer.visible = false;
    expect(toggleVisibleChain(layer, [parent])).toBe(true);
    expect([layer.visible, parent.visible]).toEqual([true, true]);
  });

  it("inserts and reorders layer blocks without losing active selection", () => {
    const value = state(), inserted = { fid: null };
    expect(insertLayer(value, inserted, 1)).toBe(1);
    expect(value.layers[1]).toBe(inserted); expect(value.cur).toBe(1);
    const first = value.layers[0], target = value.layers.at(-1);
    if (!first || !target) throw new Error("Missing fixture layer");
    const indices = moveLayerBlock(value, [first], 7,
      () => value.layers.indexOf(target) + 1);
    expect(value.layers.at(-1)).toBe(first); expect(first.fid).toBe(7);
    expect(value.cur).toBe(indices[0]);
  });

  it("moves a folder subtree and its layer block together", () => {
    const value = state(), folder = { id: 8, parent: null };
    const first = value.layers[0], second = value.layers[1];
    if (!first || !second) throw new Error("Missing fixture layers");
    value.folders = [folder]; first.fid = 8; second.fid = 8;
    const block = moveFolderBlock(value, [folder], (layer) => layer.fid === 8,
      9, () => value.layers.length);
    expect(block).toHaveLength(2); expect(folder.parent).toBe(9);
    expect(value.layers.slice(-2)).toEqual(block);
    expect(value.markedFolders).toEqual(new Set([8]));
  });
});
