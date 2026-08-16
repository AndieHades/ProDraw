import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush";
import { cloneBrushPreset } from "../../src/logic/brush/cloneBrushPreset";

describe("cloneBrushPreset", () => {
  it("removes decoded runtime assets from persisted presets", () => {
    const loaded = { ...BUNDLED_BRUSHES[0]!, shapeMap: null, grainMap: null,
      compatibility: emptyBrushCompatibility(), warnings: ["fallback"] };
    const clone = cloneBrushPreset(loaded);
    expect(clone).toEqual(BUNDLED_BRUSHES[0]);
    expect("compatibility" in clone).toBe(false);
    expect("warnings" in clone).toBe(false);
  });
});
