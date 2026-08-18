import { describe, expect, it } from "vitest";
import { normalizedResponseCurve, responseCurve } from
  "../../src/logic/brush/responseCurve";

describe("brush response curve", () => {
  it("interpolates the authored Lineart opacity control point", () => {
    const curve = [{ x: 0, y: 0 }, { x: 0.29359, y: 0.56513 }, { x: 1, y: 1 }];
    expect(responseCurve(0.29359, curve)).toBeCloseTo(0.56513, 5);
    expect(responseCurve(0, curve)).toBe(0);
    expect(responseCurve(1, curve)).toBe(1);
  });

  it("sanitizes invalid order, duplicate x, and descending y", () => {
    expect(normalizedResponseCurve([{ x: 0.8, y: 0.2 }, { x: 0.4, y: 0.7 },
      { x: 0.4, y: 0.5 }])).toEqual([
      { x: 0, y: 0 }, { x: 0.4, y: 0.5 }, { x: 0.8, y: 0.5 }, { x: 1, y: 1 }
    ]);
  });
});
