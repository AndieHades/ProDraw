import { describe, expect, it } from "vitest";
import { shouldSmoothViewportScale } from
  "../../src/logic/view/viewportSampling.ts";

describe("viewport presentation sampling", () => {
  it("filters only valid downscale views", () => {
    expect(shouldSmoothViewportScale(0.25)).toBe(true);
    expect(shouldSmoothViewportScale(0.999)).toBe(true);
    expect(shouldSmoothViewportScale(1)).toBe(false);
    expect(shouldSmoothViewportScale(2)).toBe(false);
    expect(shouldSmoothViewportScale(0)).toBe(false);
    expect(shouldSmoothViewportScale(Number.NaN)).toBe(false);
  });
});
