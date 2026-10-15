import { describe, expect, it } from "vitest";
import { applyImportedImage } from "../../src/logic/importedImage";
import { serializePackedRgbaGrid } from "../../src/logic/raster/PackedRgbaGrid";

describe("imported PNG pixels", () => {
  it("preserves low alpha and binds the source path", () => {
    const state = { layers: [{ name: "Layer", grid: [[undefined, undefined]] as unknown }],
      sourceFormat: null as string | null, sourceLocation: null as string | null };
    const pixels = new Uint8ClampedArray([12, 34, 56, 1, 90, 80, 70, 0]);

    applyImportedImage(state, 2, 1, pixels, "sprite", "png", "C:\\Art\\sprite.png");

    const grid = state.layers[0]!.grid as unknown[][];
    expect(state.layers[0]!.name).toBe("sprite");
    expect(grid[0]![0]).toEqual([12, 34, 56, 1]);
    expect(grid[0]![1]).toBeNull();
    expect(state).toMatchObject({ sourceFormat: "png",
      sourceLocation: "C:\\Art\\sprite.png" });
  });

  it("stores the layer as packed rows instead of a cell per pixel", () => {
    const state = { layers: [{ name: "Layer", grid: [] as unknown }],
      sourceFormat: null as string | null, sourceLocation: null as string | null };
    const pixels = new Uint8ClampedArray(3 * 2 * 4).fill(200);

    applyImportedImage(state, 3, 2, pixels, "photo", null, null);

    expect(serializePackedRgbaGrid(state.layers[0]!.grid)).toMatchObject({
      format: "rgba-rows-v1", width: 3, height: 2, opaquePixels: 6,
      bounds: { minx: 0, miny: 0, maxx: 2, maxy: 1 } });
    expect(state).toMatchObject({ sourceFormat: null, sourceLocation: null });
  });
});
