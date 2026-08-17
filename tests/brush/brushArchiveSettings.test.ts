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
});
