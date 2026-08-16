import { describe, expect, it } from "vitest";
import type { BrushPreset } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { pressureBrushSize, renderBrushDab } from "../../src/core/brush/renderBrushDab";
import { RasterEdit } from "../../src/core/history/RasterEdit";
import { RasterSurface } from "../../src/core/raster/RasterSurface";

const source = BUNDLED_BRUSHES[0]!;

function alphaMetric(brush: BrushPreset): number {
  const surface = new RasterSurface("metric", 64, 64, 64);
  const edit = new RasterEdit(surface, "metric");
  renderBrushDab(edit, brush,
    { x: 32, y: 32, pressure: 0.35, tiltX: 45, tiltY: 0, time: 1 },
    { size: 24, opacity: 0.8, erase: false },
    { red: 20, green: 80, blue: 160, alpha: 255 });
  edit.commit();
  let alpha = 0;
  surface.visitTiles((_coordinate, bytes) => {
    for (let index = 3; index < bytes.length; index += 4) alpha += bytes[index]!;
  });
  return alpha;
}

describe("brush rendering controls", () => {
  it("makes flow, opacity, grain strength, and pressure opacity visible", () => {
    const plain = { ...source, grain: { strength: 0, scale: 1 },
      rendering: { flow: 1, opacity: 1 },
      dynamics: { ...source.dynamics, opacityByPressure: 0 } };
    const variants = [
      { ...plain, rendering: { ...plain.rendering, flow: 0.4 } },
      { ...plain, rendering: { ...plain.rendering, opacity: 0.4 } },
      { ...plain, grain: { ...plain.grain, strength: 0.8 } },
      { ...plain, dynamics: { ...plain.dynamics, opacityByPressure: 0.8 } }
    ];
    for (const variant of variants) expect(alphaMetric(variant)).not.toBe(alphaMetric(plain));
  });

  it("makes pressure, tilt enablement, and size limits affect dab size", () => {
    const responsive = { ...source,
      dynamics: { sizeByPressure: 1, opacityByPressure: 0, tiltToSize: 1 },
      properties: { minimumSize: 1, maximumSize: 100 } };
    const pressure = pressureBrushSize(responsive, 20,
      { pressure: 0.4, tiltX: 0, tiltY: 0 });
    const tilt = pressureBrushSize(responsive, 20,
      { pressure: 0.4, tiltX: 90, tiltY: 0 });
    const disabled = pressureBrushSize({ ...responsive,
      stylus: { ...responsive.stylus, tiltEnabled: false } }, 20,
    { pressure: 0.4, tiltX: 90, tiltY: 0 });
    expect(tilt).toBeGreaterThan(pressure);
    expect(disabled).toBe(pressure);
    expect(pressureBrushSize({ ...responsive, properties: { minimumSize: 12,
      maximumSize: 14 } }, 100, { pressure: 1, tiltX: 0, tiltY: 0 })).toBe(14);
  });
});
