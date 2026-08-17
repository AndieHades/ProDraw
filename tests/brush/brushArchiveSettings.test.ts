import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { applyBrushArchiveSettings } from
  "../../src/core/brush/brushArchiveSettings";

describe("Procreate bundled shape settings", () => {
  it("maps the authored hard round source used by both screentones", () => {
    const result = applyBrushArchiveSettings(BUNDLED_BRUSHES[0]!, {
      bundledShapePath: "Brush-Preset-Hard.png", shapeRoundness: 1
    }, true);
    expect(result.preset.shape).toMatchObject({ hardness: 1, roundness: 1,
      sourceName: "Brush-Preset-Hard.png" });
    expect(result.compatibility.supportedFields).toContain("bundledShapePath");
  });

  it("keeps the built-in grain identity for Studio and production", () => {
    const result = applyBrushArchiveSettings(BUNDLED_BRUSHES[0]!, {
      bundledGrainPath: "Brush-Artery-Charcoal-Corse.jpg", grainDepth: 1,
      textureScale: 0.13357694447040558
    }, false);
    expect(result.preset.grain).toMatchObject({ strength: 1,
      scale: 0.13357694447040558,
      sourceName: "Brush-Artery-Charcoal-Corse.jpg" });
    expect(result.compatibility.supportedFields).toContain("bundledGrainPath");
  });
});
