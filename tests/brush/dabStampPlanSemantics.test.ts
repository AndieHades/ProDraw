import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { dabStampPlan } from "../../src/logic/brush/dabStampPlan";

describe("Procreate shape scatter and count", () => {
  it("rotates coincident shape stamps instead of displacing them", () => {
    const source = BUNDLED_BRUSHES[0]!;
    const brush = { ...source,
      strokePath: { ...source.strokePath, scatter: 4 },
      shape: { ...source.shape, scatter: 1, count: 4, countJitter: 0 } };
    const stamps = dabStampPlan(brush, { x: 12, y: 18, pressure: 1,
      tiltX: 0, tiltY: 0, time: 4, dabIndex: 2 }, 40);
    expect(stamps).toHaveLength(4);
    expect(stamps.every(({ x, y }) => x === 12 && y === 18)).toBe(true);
    expect(new Set(stamps.map(({ rotation }) => rotation)).size).toBeGreaterThan(1);
  });
});
