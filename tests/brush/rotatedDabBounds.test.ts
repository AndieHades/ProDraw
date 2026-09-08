import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes.ts";
import { visitBrushDab } from "../../src/core/brush/renderBrushDab.ts";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush.ts";

describe("rotated bitmap footprint", () => {
  const map = { width: 8, height: 8, data: new Uint8Array(64).fill(255) };
  const brush = { ...BUNDLED_BRUSHES[0]!, shapeMap: map, nativeShapeMap: map,
    grainMap: null, nativeGrainMap: null, compatibility: emptyBrushCompatibility(), warnings: [] };
  it("retains rotated corners outside the unrotated square", () => {
    const pixels = new Map<string, number>();
    visitBrushDab({ ...brush, shape: { ...brush.shape, scatter: 0, count: 1, angle: 0, roundness: 1 },
      dynamics: { ...brush.dynamics, sizeByPressure: 0 } },
    { x: 20.5, y: 20.5, rotation: Math.PI / 4, pressure: 1, tiltX: 0, tiltY: 0, time: 0 },
    { size: 20, opacity: 1, erase: false }, (x, y, alpha) => pixels.set(`${x},${y}`, alpha));
    expect(pixels.get("33,20")).toBeGreaterThan(0);
    expect(pixels.get("20,33")).toBeGreaterThan(0);
    expect(pixels.has("35,20")).toBe(false);
  });

  it("visits only a supplied damage region, even for a large off-canvas stamp", () => {
    const pixels: string[] = [];
    visitBrushDab(brush, { x: 10, y: 10, pressure: 1, tiltX: 0, tiltY: 0, time: 0 },
      { size: 400, opacity: 1, erase: false, bounds: { minx: 10, miny: 10, maxx: 11, maxy: 11 } },
      (x, y) => pixels.push(`${x},${y}`));
    expect(new Set(pixels)).toEqual(new Set(["10,10", "11,10", "10,11", "11,11"]));
  });
});
