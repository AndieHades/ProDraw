import { describe, expect, it } from "vitest";
import { alphaContour } from "../../src/logic/brush/alphaContour";

describe("brush cursor alpha contour", () => {
  it("preserves the outside edge and a transparent hole", () => {
    const data = Uint8Array.from([
      255, 255, 255,
      255, 0, 255,
      255, 255, 255
    ]);
    const segments = alphaContour({ width: 3, height: 3, data }, 12);
    expect(segments).toHaveLength(16);
    expect(segments).toContainEqual({ x1: 2, y1: 1, x2: 1, y2: 1 });
    expect(segments).toContainEqual({ x1: 1, y1: 2, x2: 2, y2: 2 });
  });

  it("keeps disconnected texture islands as separate outlines", () => {
    const segments = alphaContour({ width: 3, height: 1,
      data: Uint8Array.from([255, 0, 255]) }, 12);
    expect(segments).toHaveLength(8);
  });
});
