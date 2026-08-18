import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { savedBrushControls } from "../../src/logic/brush/savedBrushControls";

describe("saved brush controls", () => {
  it("restores an authored slider position inside the brush size domain", () => {
    const source = BUNDLED_BRUSHES[0]!;
    const brush = { ...source, savedSize: 0.25, savedOpacity: 0.84,
      properties: { ...source.properties, minimumSize: 2, maximumSize: 102 } };

    expect(savedBrushControls(brush, 500)).toEqual({ size: 27, opacity: 0.84 });
  });
});
