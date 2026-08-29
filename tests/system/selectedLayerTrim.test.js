/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { doUndo } from "../../src/core/history.js";
import { dirtyAll } from "../../src/core/layer-cache.js";
import { newLayer, S } from "../../src/core/state.js";
import { trimSelectedLayers } from "../../src/systems/trim.js";

const rgba = (red) => [red, 2, 3, 255];
const pixel = (layer, x, y, red) => { layer.grid[y][x] = rgba(red); };

function reset() {
  S.W = 12; S.H = 10; S.cur = 0; S.layers = [];
  S.folders = []; S.animator = null; S.undoStack = []; S.redoStack = [];
  S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.fxSel = new Set(); S.fxCur = null; S.sel = S.selMask = S.selFloat = null;
  S.view = { zoom: 4, ox: 0, oy: 0 };
}

describe("selected layer canvas trim", () => {
  beforeEach(reset);

  it("uses the outer union of multiple selected layers, including hidden ones", () => {
    const active = newLayer("Active", 12, 10), larger = newLayer("Hidden", 12, 10);
    const excluded = newLayer("Excluded", 12, 10);
    pixel(active, 3, 3, 10); pixel(active, 4, 4, 11);
    pixel(larger, 1, 1, 20); pixel(larger, 7, 6, 21); larger.visible = false;
    pixel(excluded, 11, 9, 30);
    S.layers = [active, larger, excluded]; S.cur = 0; S.marked = new Set([0, 1]);
    dirtyAll({ preserveGridBounds: true });

    expect(trimSelectedLayers()).toBe(true);
    expect([S.W, S.H]).toEqual([7, 6]);
    expect(larger.grid[0][0]).toEqual(rgba(20));
    expect(larger.grid[5][6]).toEqual(rgba(21));
    expect(excluded.ext.get("10,8")).toEqual(rgba(30));
  });

  it("includes hidden nested folder layers and selected folder effects", () => {
    const direct = newLayer("Direct", 12, 10), nested = newLayer("Nested", 12, 10);
    direct.fid = 1; nested.fid = 2; direct.visible = nested.visible = false;
    pixel(direct, 4, 3, 40); pixel(nested, 6, 5, 41);
    S.layers = [direct, nested]; S.folders = [
      { id: 1, parent: null, visible: false, effects: [
        { type: "stroke", visible: true, params: { size: 1 } }] },
      { id: 2, parent: 1, visible: false, effects: [] }
    ];
    S.selFolder = 1; S.markedFolders = new Set([1]);
    dirtyAll({ preserveGridBounds: true });

    expect(trimSelectedLayers()).toBe(true);
    expect([S.W, S.H]).toEqual([5, 5]);
    expect(direct.grid[1][1]).toEqual(rgba(40));
    expect(nested.grid[3][3]).toEqual(rgba(41));
  });

  it("restores every unselected pixel and raster reference with one Undo", () => {
    const outside = newLayer("Outside", 12, 10), target = newLayer("Target", 12, 10);
    pixel(outside, 0, 0, 50); pixel(outside, 11, 9, 51);
    pixel(target, 3, 2, 60); pixel(target, 8, 7, 61);
    S.layers = [outside, target]; S.cur = 1; dirtyAll({ preserveGridBounds: true });
    const outsideGrid = outside.grid, targetGrid = target.grid;

    expect(trimSelectedLayers()).toBe(true);
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0]?.kind).toBe("document-remap-patch");
    expect(outside.ext.get("-3,-2")).toEqual(rgba(50));
    expect(outside.ext.get("8,7")).toEqual(rgba(51));

    doUndo();
    expect([S.W, S.H]).toEqual([12, 10]);
    expect(outside.grid).toBe(outsideGrid); expect(target.grid).toBe(targetGrid);
    expect(outside.grid[0][0]).toEqual(rgba(50));
    expect(outside.grid[9][11]).toEqual(rgba(51));
  });

  it("leaves the canvas and history unchanged when selected targets are empty", () => {
    S.layers = [newLayer("Empty", 12, 10)]; dirtyAll({ preserveGridBounds: true });
    expect(trimSelectedLayers()).toBe(false);
    expect([S.W, S.H]).toEqual([12, 10]); expect(S.undoStack).toHaveLength(0);
  });
});
