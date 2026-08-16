import { describe, expect, it } from "vitest";
import { RasterDocument } from "../../src/core/document/RasterDocument";
import { compositeTile, compositeTileCoordinates } from "../../src/core/document/compositeTiles";

describe("composite tiles", () => {
  it("only visits allocated visible tiles", () => {
    const document = new RasterDocument({
      id: "doc", name: "Test", width: 1024, height: 1024, dpi: 72
    });
    const layer = document.addLayer({ id: "layer", name: "Layer", visible: true,
      locked: false, opacity: 1, blendMode: "normal" });
    layer.surface.blendPixel(300, 20, { red: 9, green: 8, blue: 7, alpha: 255 });
    expect(compositeTileCoordinates(document)).toEqual([{ x: 1, y: 0 }]);
    expect(compositeTile(document, 1, 0)?.some((value) => value > 0)).toBe(true);
    document.updateLayer("layer", { visible: false });
    expect(compositeTileCoordinates(document)).toEqual([]);
  });
});
