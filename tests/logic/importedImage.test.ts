import { describe, expect, it } from "vitest";
import { applyImportedImage } from "../../src/logic/importedImage";

describe("imported PNG pixels", () => {
  it("preserves low alpha and binds the source path", () => {
    const state = { layers: [{ name: "Layer", grid: [[undefined, undefined]] }],
      sourceFormat: null as string | null, sourceLocation: null as string | null };
    const pixels = new Uint8ClampedArray([12, 34, 56, 1, 90, 80, 70, 0]);

    applyImportedImage(state, 2, 1, pixels, "sprite", "png", "C:\\Art\\sprite.png");

    expect(state.layers[0]).toMatchObject({ name: "sprite",
      grid: [[[12, 34, 56, 1], undefined]] });
    expect(state).toMatchObject({ sourceFormat: "png",
      sourceLocation: "C:\\Art\\sprite.png" });
  });
});
