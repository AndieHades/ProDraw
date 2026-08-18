import { describe, expect, it } from "vitest";
import type { LoadedBrush } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { compactBrushPreviewPixels } from "../../src/ui/brushes/renderBrushPreview";
import { testShapeMap } from "./brushTestMaps";

describe("compact brush preview pixels", () => {
  it("renders the resolved shape source instead of a circular fallback", () => {
    const source = BUNDLED_BRUSHES[0]!;
    const brush: LoadedBrush = { ...source, shapeMap: testShapeMap,
      nativeShapeMap: testShapeMap, grainMap: null, nativeGrainMap: null,
      compatibility: { archiveVersion: null, archiveName: null, supportedFields: [],
        unsupportedActiveFields: [], excludedSections: ["wet-mix", "color-dynamics",
          "materials"], shapeSourceState: "resolved", grainSourceState: "missing",
        missingSourceNames: [] }, warnings: [] };

    const pixels = compactBrushPreviewPixels(brush);
    const bounds = alphaBounds(pixels, 80);

    expect(bounds.height).toBeGreaterThan(bounds.width * 1.3);
  });
});

function alphaBounds(pixels: Uint8ClampedArray, side: number) {
  let minX = side, minY = side, maxX = -1, maxY = -1;
  for (let y = 0; y < side; y += 1) for (let x = 0; x < side; x += 1) {
    if ((pixels[(y * side + x) * 4 + 3] ?? 0) < 8) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}
