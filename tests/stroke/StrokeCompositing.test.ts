import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { TileHistory } from "../../src/core/history/TileHistory";
import { RasterSurface } from "../../src/core/raster/RasterSurface";
import { ActiveRasterStroke } from "../../src/systems/drawing/ActiveRasterStroke";

const source = BUNDLED_BRUSHES[0]!;
const brush = { ...source,
  strokePath: { ...source.strokePath, spacing: 0.5, spacingJitter: 0,
    lateralJitter: 0, linearJitter: 0, fallOff: 0 },
  stabilization: { ...source.stabilization, streamlineAmount: 0,
    stabilizationAmount: 0, motionFilteringAmount: 0 },
  taper: { ...source.taper, start: 0, end: 0 },
  shape: { ...source.shape, hardness: 1, scatter: 0, count: 1 },
  grain: { ...source.grain, strength: 0 },
  rendering: { ...source.rendering, flow: 1, opacity: 1,
    mode: "intense-blending" as const },
  dynamics: { ...source.dynamics, sizeByPressure: 0, opacityByPressure: 0,
    opacityJitter: 0, speedOpacity: 0, tiltOpacity: 0 },
  properties: { ...source.properties, minimumOpacity: 0, maximumOpacity: 1 } };

function fixture() {
  const surface = new RasterSurface("stroke", 32, 24, 16);
  const history = new TileHistory(); history.registerSurface(surface);
  const stroke = new ActiveRasterStroke({ viewport: { screenToDocument: (point) => point,
    requestRender: () => undefined }, history, getBrush: () => brush,
    getColor: () => ({ red: 20, green: 40, blue: 80, alpha: 255 }),
    getSize: () => 6, getOpacity: () => 0.5 }, surface, "brush");
  return { stroke, surface, history };
}

const sample = (x: number, time: number) => ({ x, y: 12, pressure: 1,
  tiltX: 0, tiltY: 0, time, pointerType: "pen" as const });

describe("stroke-owned compositing", () => {
  it("does not darken a same-stroke overlap and records one undo", () => {
    const { stroke, surface, history } = fixture();
    stroke.push(sample(8, 0)); stroke.push(sample(20, 10)); stroke.push(sample(8, 20));
    expect(stroke.commit()).toBe(true);
    expect(surface.getPixel(8, 12).alpha).toBe(surface.getPixel(20, 12).alpha);
    expect(history.undoCount).toBe(1); history.undo();
    expect(surface.getPixel(8, 12).alpha).toBe(0);
  });

  it("restores the preview when a stroke is cancelled", () => {
    const { stroke, surface, history } = fixture();
    stroke.push(sample(8, 0)); expect(surface.getPixel(8, 12).alpha).toBeGreaterThan(0);
    stroke.cancel(); expect(surface.getPixel(8, 12).alpha).toBe(0);
    expect(history.undoCount).toBe(0);
  });
});
