/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { doUndo } from "../../src/core/history.js";
import { dirtyAll } from "../../src/core/layer-cache.js";
import { newLayer, S } from "../../src/core/state.ts";
import { applyCrop, cancelCrop, fitCropToContent, toggleCrop } from "../../src/systems/crop.js";
import { trimCanvas, trimSelectedLayers } from "../../src/systems/trim.js";

const W = 24, H = 20;
const put = (layer, x, y, alpha) => { layer.grid[y][x] = [9, 8, 7, alpha]; };

function reset() {
  document.body.innerHTML = '<canvas id="cv"></canvas><button id="crop"></button>' +
    '<div id="cropbar"></div><input id="crop-w"><input id="crop-h"><span id="crop-px"></span>';
  Object.assign(S, { W, H, cur: 0, layers: [], folders: [], animator: null,
    undoStack: [], redoStack: [], marked: new Set(), markedFolders: new Set(),
    selFolder: null, fxSel: new Set(), fxCur: null, sel: null, selMask: null,
    selFloat: null, rotMode: null, cropMode: null, tool: "pencil",
    view: { zoom: 4, ox: 0, oy: 0 } });
}

// рисунок 6..13 × 5..11 с мягким краем и остатками стирания по углам холста
function erasedArtwork() {
  const art = newLayer("Art", W, H);
  for (let y = 5; y <= 11; y++) for (let x = 6; x <= 13; x++) put(art, x, y, 255);
  put(art, 14, 8, 60); put(art, 15, 9, 6);
  put(art, 0, 0, 120); put(art, 23, 19, 30); put(art, 22, 1, 3); put(art, 1, 18, 170);
  S.layers = [art]; dirtyAll({ preserveGridBounds: true }); return art;
}

describe("content fit ignores erase residue", () => {
  beforeEach(reset);
  afterEach(() => { if (S.cropMode) cancelCrop(); });

  it("trims the canvas to the artwork and its soft edge in one Undo step", () => {
    const art = erasedArtwork();
    expect(trimCanvas()).toBe(true);
    expect([S.W, S.H]).toEqual([10, 7]);
    expect(art.grid[0][0]).toEqual([9, 8, 7, 255]);
    expect(art.grid[4][9]).toEqual([9, 8, 7, 6]);
    expect(art.ext.get("-6,-5")).toEqual([9, 8, 7, 120]);
    expect(S.undoStack).toHaveLength(1);
    doUndo();
    expect([S.W, S.H]).toEqual([W, H]); expect(art.grid[0][0]).toEqual([9, 8, 7, 120]);
  });

  it("still grows selected-layer trim by the layer effect reach", () => {
    const art = erasedArtwork();
    art.effects = [{ type: "stroke", visible: true, params: { size: 1 } }];
    expect(trimSelectedLayers()).toBe(true);
    expect([S.W, S.H]).toEqual([12, 9]);
  });

  it("fits the crop frame to content, honouring a moved artwork, then applies once", () => {
    const art = erasedArtwork();
    toggleCrop(); S.cropMode.idx = 2; S.cropMode.idy = -1;
    fitCropToContent();
    expect(S.cropMode).toMatchObject({ x0: 8, y0: 4, x1: 17, y1: 10 });
    applyCrop();
    expect([S.W, S.H]).toEqual([10, 7]); expect(S.undoStack).toHaveLength(1);
    expect(art.grid[0][0]).toEqual([9, 8, 7, 255]);
    expect(art.ext.get("17,14")).toEqual([9, 8, 7, 30]);
  });
});
