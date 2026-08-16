import { describe, expect, it } from "vitest";
import { RasterDocument } from "../../src/core/document/RasterDocument";

function layer(id: string) {
  return { id, name: id, visible: true, locked: false,
    opacity: 1, blendMode: "normal" as const };
}

describe("RasterDocument", () => {
  it("owns independently tiled RGBA layers and composites them", () => {
    const document = new RasterDocument({
      id: "doc", name: "Test", width: 4096, height: 4096, dpi: 300
    });
    const bottom = document.addLayer(layer("bottom"));
    bottom.surface.blendPixel(2, 3, { red: 0, green: 0, blue: 255, alpha: 255 });
    const top = document.addLayer({ ...layer("top"), opacity: 0.5 });
    top.surface.blendPixel(2, 3, { red: 255, green: 0, blue: 0, alpha: 255 });
    expect(document.compositePixel(2, 3)).toEqual({
      red: 128, green: 0, blue: 128, alpha: 255
    });
    expect(bottom.surface.allocatedTileCount).toBe(1);
    expect(top.surface.allocatedTileCount).toBe(1);
  });

  it("refuses drawing into hidden or locked active layers", () => {
    const document = new RasterDocument({
      id: "doc", name: "Test", width: 64, height: 64, dpi: 72
    });
    document.addLayer({ ...layer("paint"), locked: true });
    expect(() => document.editableSurface()).toThrow("not editable");
    document.updateLayer("paint", { locked: false, visible: false });
    expect(() => document.editableSurface()).toThrow("not editable");
  });

  it("publishes a detached serializable snapshot", () => {
    const document = new RasterDocument({
      id: "doc", name: "Test", width: 64, height: 32, dpi: 72
    });
    document.addLayer(layer("paint"));
    const snapshot = document.snapshot();
    document.updateLayer("paint", { name: "Changed" });
    expect(snapshot.layers[0]?.name).toBe("paint");
    expect(snapshot.activeLayerId).toBe("paint");
  });
});
