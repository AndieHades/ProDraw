import { describe, expect, it } from "vitest";
import { visibleTileBounds } from "../../src/logic/view/visibleTileBounds";

describe("visibleTileBounds", () => {
  it("maps a panned and rotated viewport to a conservative tile range", () => {
    const bounds = visibleTileBounds(
      { offsetX: 128, offsetY: 64, scale: 0.5, rotation: Math.PI / 2 },
      { width: 512, height: 256 }, { width: 2048, height: 1024 }, 256
    );
    expect(bounds).not.toBeNull();
    expect(bounds?.minimumX).toBeGreaterThanOrEqual(0);
    expect(bounds?.minimumY).toBeGreaterThanOrEqual(0);
    expect(bounds?.maximumX).toBeLessThan(8);
    expect(bounds?.maximumY).toBeLessThan(4);
  });

  it("returns no tile work when the whole document is offscreen", () => {
    expect(visibleTileBounds(
      { offsetX: 1000, offsetY: 1000, scale: 1, rotation: 0 },
      { width: 100, height: 100 }, { width: 256, height: 256 }, 256
    )).toBeNull();
  });
});
