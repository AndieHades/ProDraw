import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { LoadedBrush } from "../../src/contracts/brush";
import { brushCursorMask } from "../../src/core/brush/brushCursorMask";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush";
import cursorConfig from "../../src/config/cursor-mask.json";

function loadedBigSoft(): LoadedBrush {
  const preset = BUNDLED_BRUSHES.find(({ name }) => name === "Big Soft Brush");
  if (!preset) throw new Error("Big Soft Brush fixture is unavailable");
  return { ...preset, shapeMap: null, grainMap: null,
    nativeShapeMap: null, nativeGrainMap: null,
    compatibility: emptyBrushCompatibility(), warnings: [] };
}

describe("brush cursor presentation mask", () => {
  it("bounds large cursor work without changing its document-space size", () => {
    const brush = loadedBigSoft();
    const mask = brushCursorMask(brush, 500,
      { x: 250, y: 250, pressure: 1, tiltX: 0, tiltY: 0, time: 0 });
    expect(mask.width).toBeLessThanOrEqual(cursorConfig.maximumSide);
    expect(mask.height).toBeLessThanOrEqual(cursorConfig.maximumSide);
    expect(mask.scale).toBeGreaterThan(3);
    expect(mask.width * mask.scale).toBeGreaterThan(500);
    expect(mask.data.some((alpha) => alpha > 0)).toBe(true);
    expect(brushCursorMask(brush, 500,
      { x: 251, y: 250, pressure: 1, tiltX: 0, tiltY: 0, time: 1 })).toBe(mask);
  });
});
