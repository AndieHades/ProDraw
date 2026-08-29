import { describe, expect, it } from "vitest";
import { createDocumentRemapEntry, swapDocumentRemapEntry } from
  "../../src/core/history/documentRemapPatch";

describe("typed document remap patch", () => {
  it("restores canvas size and the exact off-canvas raster references", () => {
    const originalGrid = [["old"]], originalExt = new Map([["-1,0", "pixel"]]);
    const layer = { grid: originalGrid, ext: originalExt };
    const state = { W: 1, H: 1, layers: [layer], cur: 0 };
    const entry = createDocumentRemapEntry(state);
    if (!entry) throw new Error("Missing document remap entry");
    state.W = 4; state.H = 3; layer.grid = [["new"]]; layer.ext = new Map();
    expect(swapDocumentRemapEntry(entry, state)).not.toBeNull();
    expect(state).toMatchObject({ W: 1, H: 1 });
    expect(layer.grid).toBe(originalGrid); expect(layer.ext).toBe(originalExt);
  });

  it("rejects undo after layer identity changes", () => {
    const state = { W: 2, H: 2, layers: [{ grid: [] }], cur: 0 };
    const entry = createDocumentRemapEntry(state);
    state.layers[0] = { grid: [] };
    expect(entry && swapDocumentRemapEntry(entry, state)).toBeNull();
  });
});
