/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import * as bus from "../../src/core/bus.js";
import { newLayer, S } from "../../src/core/state.js";
import { beginPixelBatch, beginPixelPatch, cancelPixelPatch, commitPixelPatch, doRedo, doUndo,
  recordPixelBefore, snapshot, snapshotEffects } from "../../src/core/history.js";
import { monoAll } from "../../src/systems/mono.js";
import { markDirty } from "../../src/core/layer-cache.js";

const rgba = (red) => [red, 2, 3, 255];
const effect = (id, size) => ({ id, type: "stroke", visible: true, opacity: 1,
  params: { size, color: "#123456" } });

function reset() {
  S.W = 3; S.H = 3; S.cur = 0;
  S.layers = [newLayer("one", 3, 3), newLayer("two", 3, 3)];
  S.folders = [{ id: 7, name: "folder", parent: null, effects: [] }];
  S.folderSeq = 7; S.undoStack = []; S.redoStack = [];
  S.marked = new Set(); S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.sel = S.selFloat = S.rotMode = null;
}

describe("legacy lightweight history", () => {
  beforeEach(reset);

  it("keeps the single-layer pixel patch contract", () => {
    expect(beginPixelPatch(0)).toBe(true); recordPixelBefore(0, 1, 1, null);
    S.layers[0].grid[1][1] = rgba(9); expect(commitPixelPatch()).toBe(true);
    expect(S.undoStack[0].kind).toBe("pixel-patch");
    doUndo(); expect(S.layers[0].grid[1][1]).toBeNull();
    doRedo(); expect(S.layers[0].grid[1][1]).toEqual(rgba(9));
    S.layers[0].kind = "text"; expect(beginPixelPatch(0)).toBe(false);
  });

  it("undoes, redoes and cancels a multi-layer pixel batch as one entry", () => {
    expect(beginPixelBatch([0, 1])).toBe(true);
    recordPixelBefore(0, 0, 1, null); recordPixelBefore(1, 2, 1, null);
    S.layers[0].grid[1][0] = rgba(10); S.layers[1].grid[1][2] = rgba(20);
    expect(commitPixelPatch()).toBe(true);
    expect(S.undoStack).toHaveLength(1); expect(S.undoStack[0].kind).toBe("pixel-batch");
    doUndo(); expect(S.layers[0].grid[1][0]).toBeNull();
    expect(S.layers[1].grid[1][2]).toBeNull();
    doRedo(); expect(S.layers[0].grid[1][0]).toEqual(rgba(10));
    expect(S.layers[1].grid[1][2]).toEqual(rgba(20));

    expect(beginPixelBatch([0, 1])).toBe(true);
    recordPixelBefore(0, 0, 1, rgba(10)); recordPixelBefore(1, 2, 1, rgba(20));
    S.layers[0].grid[1][0] = rgba(30); S.layers[1].grid[1][2] = rgba(40);
    expect(cancelPixelPatch()).toBe(true);
    expect(S.layers[0].grid[1][0]).toEqual(rgba(10));
    expect(S.layers[1].grid[1][2]).toEqual(rgba(20));
    expect(S.undoStack).toHaveLength(1);
  });

  it("drops a no-op batch without clearing redo", () => {
    S.layers[0].grid[0][0] = rgba(5); S.redoStack = [{ sentinel: true }];
    expect(beginPixelBatch([0, 1])).toBe(true);
    recordPixelBefore(0, 0, 0, rgba(5)); recordPixelBefore(1, 1, 1, null);
    expect(commitPixelPatch()).toBe(false);
    expect(S.undoStack).toHaveLength(0); expect(S.redoStack).toHaveLength(1);
    expect(beginPixelBatch([0, 1])).toBe(true);
    expect(cancelPixelPatch()).toBe(false);
  });

  it("snapshots only layer and folder effect descriptors", () => {
    S.layers[0].effects = [effect(1, 1)]; S.folders[0].effects = [effect(2, 2)];
    const layerGrid = S.layers[0].grid;
    const folderBefore = JSON.stringify(S.folders[0].effects);
    let gridReads = 0;
    Object.defineProperty(S.layers[0], "grid", { configurable: true,
      get: () => { gridReads += 1; return layerGrid; } });
    let snapshots = 0; const off = bus.on("snapshot", () => snapshots++);
    expect(snapshotEffects([{ kind: "layer", index: 0 },
      { kind: "folder", id: 7 }])).toBe(true);
    off();
    expect(snapshots).toBe(1); expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0]).not.toHaveProperty("layers"); expect(gridReads).toBe(0);
    expect(S.layers[0].grid).toBe(layerGrid);
    S.layers[0].effects = [effect(3, 8)]; S.folders[0].effects = [];
    const layerAfter = JSON.stringify(S.layers[0].effects);
    let layerEvents = 0, renderEvents = 0;
    const offLayers = bus.on("layers", () => layerEvents++);
    const offRender = bus.on("render", () => renderEvents++);
    doUndo(); expect(JSON.stringify(S.layers[0].effects)).toBe(JSON.stringify([effect(1, 1)]));
    expect(JSON.stringify(S.folders[0].effects)).toBe(folderBefore);
    expect(S.layers[0].grid).toBe(layerGrid);
    doRedo(); expect(JSON.stringify(S.layers[0].effects)).toBe(layerAfter);
    expect(S.folders[0].effects).toEqual([]);
    offLayers(); offRender(); expect(layerEvents).toBe(2); expect(renderEvents).toBe(2);
  });

  it("resolves effects after an intervening structural full snapshot", () => {
    S.layers[0].effects = [effect(10, 1)]; S.folders[0].effects = [effect(20, 2)];
    const before = JSON.stringify([S.layers[0].effects, S.folders[0].effects]);
    snapshotEffects([S.layers[0], S.folders[0]]);
    S.layers[0].effects = [effect(11, 5)]; S.folders[0].effects = [effect(21, 6)];
    const after = JSON.stringify([S.layers[0].effects, S.folders[0].effects]);
    snapshot(); S.layers.unshift(newLayer("inserted", 3, 3));
    doUndo(); expect(JSON.stringify([S.layers[0].effects, S.folders[0].effects])).toBe(after);
    doUndo(); expect(JSON.stringify([S.layers[0].effects, S.folders[0].effects])).toBe(before);
    doRedo(); expect(JSON.stringify([S.layers[0].effects, S.folders[0].effects])).toBe(after);
    doRedo(); expect(S.layers[0].name).toBe("inserted");
  });

  it("stores Monochrome as touched pixels instead of cloned layers", () => {
    S.layers[0].grid[1][1] = [200, 50, 10, 255];
    markDirty(0, { minx: 1, miny: 1, maxx: 1, maxy: 1 });
    const originalGrid = S.layers[0].grid;
    monoAll();
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe("pixel-batch");
    expect(S.undoStack[0]).not.toHaveProperty("layers");
    expect(S.layers[0].grid).toBe(originalGrid);
    expect(S.layers[0].grid[1][1]).toEqual([90, 90, 90, 255]);
    doUndo(); expect(S.layers[0].grid[1][1]).toEqual([200, 50, 10, 255]);
    doRedo(); expect(S.layers[0].grid[1][1]).toEqual([90, 90, 90, 255]);
  });
});
