import { describe, expect, it } from "vitest";
import { clientToCanvas, resizeLegacyView,
  zoomLegacyViewAt } from "../../src/logic/view/LegacyViewGeometry";

describe("typed preserved view geometry", () => {
  it("keeps the pointer-anchored canvas point fixed while zooming", () => {
    const view = { zoom: 2, ox: 10, oy: 20 }, point = { x: 50, y: 70 };
    const before = clientToCanvas(point.x, point.y, { left: 0, top: 0 }, view);
    const next = zoomLegacyViewAt(view, point, 1.5, 0.1, 40);
    expect(clientToCanvas(point.x, point.y, { left: 0, top: 0 }, next)).toEqual(before);
  });

  it("keeps canvas screen centre stable across Crop resize", () => {
    expect(resizeLegacyView({ zoom: 2, ox: 10, oy: 20 }, 100, 50,
      50, 25, 0.1, 40)).toEqual({ zoom: 4, ox: 10, oy: 20 });
  });
});
