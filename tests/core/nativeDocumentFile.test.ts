import { describe, expect, it } from "vitest";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { decodeNativeDocument, encodeNativeDocument } from
  "../../src/core/persistence/nativeDocumentFile";

describe("native ProDraw documents", () => {
  it("round-trips exact RGBA layers and rejects corrupt input", () => {
    const ids = ["native", "paint", "ink"];
    const document = createRasterDocument({ name: "Native", width: 64, height: 48,
      dpi: 300, layerName: "Paint" }, () => ids.shift() ?? "extra");
    document.editableSurface().blendPixel(12, 19,
      { red: 11, green: 67, blue: 203, alpha: 177 });
    const ink = document.addLayer({ id: "ink", name: "Ink", visible: true,
      locked: false, opacity: 0.7, blendMode: "normal" });
    ink.surface.blendPixel(20, 7, { red: 220, green: 30, blue: 18, alpha: 255 });
    const restored = decodeNativeDocument(encodeNativeDocument(document));

    expect(restored.snapshot()).toEqual(document.snapshot());
    expect(restored.layers[0]?.surface.getPixel(12, 19))
      .toEqual(document.layers[0]?.surface.getPixel(12, 19));
    expect(restored.layers[1]?.surface.getPixel(20, 7))
      .toEqual(document.layers[1]?.surface.getPixel(20, 7));
    expect(() => decodeNativeDocument(new TextEncoder().encode("{}")))
      .toThrow("Unsupported or corrupt");
  });
});
