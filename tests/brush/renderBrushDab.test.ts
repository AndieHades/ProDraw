import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { RasterEdit } from "../../src/core/history/RasterEdit";
import { RasterSurface } from "../../src/core/raster/RasterSurface";
import { renderBrushDab } from "../../src/core/brush/renderBrushDab";

describe("brush dab renderer", () => {
  it("makes a non-empty RGBA mark for every bundled brush profile", () => {
    for (const brush of BUNDLED_BRUSHES) {
      const surface = new RasterSurface(brush.id, 64, 64, 32);
      const edit = new RasterEdit(surface, brush.name);
      renderBrushDab(edit, brush,
        { x: 32, y: 32, pressure: 0.8, tiltX: 0, tiltY: 0, time: 1 },
        { size: 18, opacity: 1, erase: false },
        { red: 24, green: 120, blue: 230, alpha: 255 });
      expect(edit.commit(), brush.name).not.toBeNull();
      expect(surface.allocatedTileCount, brush.name).toBeGreaterThan(0);
      expect(surface.getPixel(32, 32).alpha, brush.name).toBeGreaterThan(0);
    }
  });

  it("honors pressure size dynamics and eraser coverage", () => {
    const brush = BUNDLED_BRUSHES[0];
    expect(brush).toBeDefined();
    if (!brush) return;
    const surface = new RasterSurface("paint", 64, 64, 32);
    const paint = new RasterEdit(surface, "paint");
    renderBrushDab(paint, brush,
      { x: 32, y: 32, pressure: 1, tiltX: 0, tiltY: 0, time: 1 },
      { size: 20, opacity: 1, erase: false },
      { red: 255, green: 0, blue: 0, alpha: 255 });
    paint.commit();
    const erase = new RasterEdit(surface, "erase");
    renderBrushDab(erase, brush,
      { x: 32, y: 32, pressure: 1, tiltX: 0, tiltY: 0, time: 2 },
      { size: 20, opacity: 1, erase: true },
      { red: 0, green: 0, blue: 0, alpha: 255 });
    erase.commit();
    expect(surface.getPixel(32, 32).alpha).toBe(0);
  });
});
