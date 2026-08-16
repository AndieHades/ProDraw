import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { renderSmudgeDab } from "../../src/core/brush/renderSmudgeDab";
import { RasterEdit } from "../../src/core/history/RasterEdit";
import { TileHistory } from "../../src/core/history/TileHistory";
import { RasterSurface } from "../../src/core/raster/RasterSurface";

const red = { red: 255, green: 0, blue: 0, alpha: 255 };
const blue = { red: 0, green: 0, blue: 255, alpha: 255 };

describe("renderSmudgeDab", () => {
  it("pulls local pigment within brush bounds and undoes as one edit", () => {
    const surface = new RasterSurface("smudge", 64, 32);
    const setup = new RasterEdit(surface, "setup");
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 64; x += 1) setup.setPixel(x, y, x < 32 ? red : blue);
    }
    setup.commit();
    const history = new TileHistory();
    history.registerSurface(surface);
    const edit = history.begin(surface, "Smudge stroke");
    const brush = { ...BUNDLED_BRUSHES[0]!,
      shape: { ...BUNDLED_BRUSHES[0]!.shape, hardness: 1 },
      grain: { ...BUNDLED_BRUSHES[0]!.grain, strength: 0 } };
    const state = { carried: null };
    const settings = { size: 18, strength: 1, flow: 1, pickup: 0.2, pull: 0.9 };
    renderSmudgeDab(edit, brush,
      { x: 18, y: 16, pressure: 1, tiltX: 0, tiltY: 0, time: 0 }, settings, state);
    renderSmudgeDab(edit, brush,
      { x: 40, y: 16, pressure: 1, tiltX: 0, tiltY: 0, time: 16 }, settings, state);
    expect(surface.getPixel(40, 16).red).toBeGreaterThan(blue.red);
    expect(surface.getPixel(63, 16)).toEqual(blue);
    expect(history.record(edit.commit())).toBe(true);
    history.undo();
    expect(surface.getPixel(40, 16)).toEqual(blue);
  });
});
