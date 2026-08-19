import { describe, expect, it } from "vitest";
import { shouldSmoothViewportScale } from
  "../../src/logic/view/viewportSampling.ts";

describe("viewport presentation sampling", () => {
  it("filters every valid scaled view except exact 100 percent", () => {
    expect(shouldSmoothViewportScale(0.25)).toBe(true);
    expect(shouldSmoothViewportScale(0.999)).toBe(true);
    expect(shouldSmoothViewportScale(1)).toBe(false);
    expect(shouldSmoothViewportScale(2)).toBe(true);
    expect(shouldSmoothViewportScale(12)).toBe(true);
    expect(shouldSmoothViewportScale(0)).toBe(false);
    expect(shouldSmoothViewportScale(-1)).toBe(false);
    expect(shouldSmoothViewportScale(Number.POSITIVE_INFINITY)).toBe(false);
    expect(shouldSmoothViewportScale(Number.NaN)).toBe(false);
  });
});
