import { describe, expect, it } from "vitest";
import { mipDamageRect, mipLevelSide, unionMipBounds,
  viewportMipLevel } from "../../src/logic/view/viewportMip.ts";

describe("viewport mip level selection", () => {
  it("leaves at most a twofold bilinear reduction for the screen", () => {
    expect(viewportMipLevel(1)).toBe(0);
    expect(viewportMipLevel(0.51)).toBe(0);
    expect(viewportMipLevel(0.5)).toBe(1);
    expect(viewportMipLevel(0.3)).toBe(1);
    expect(viewportMipLevel(0.25)).toBe(2);
    expect(viewportMipLevel(0.1)).toBe(3);
    expect(viewportMipLevel(0.05)).toBe(4);
    for (const scale of [0.49, 0.3, 0.17, 0.09, 0.05]) {
      const remaining = scale * 2 ** viewportMipLevel(scale);
      expect(remaining).toBeGreaterThan(0.5);
      expect(remaining).toBeLessThanOrEqual(1);
    }
  });

  it("ignores invalid and magnified scales", () => {
    for (const scale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 4]) {
      expect(viewportMipLevel(scale)).toBe(0);
    }
  });
});

describe("viewport mip geometry", () => {
  it("rounds level sides up so the last odd source column is kept", () => {
    expect(mipLevelSide(4001, 1)).toBe(2001);
    expect(mipLevelSide(4001, 2)).toBe(1001);
    expect(mipLevelSide(3, 4)).toBe(1);
  });

  it("maps inclusive source damage to the dependent level pixels", () => {
    const bounds = { minx: 5, miny: 2, maxx: 9, maxy: 3 };
    expect(mipDamageRect(bounds, 1, 50, 50)).toEqual({ x: 2, y: 1, width: 3, height: 1 });
    expect(mipDamageRect(bounds, 2, 50, 50)).toEqual({ x: 1, y: 0, width: 2, height: 1 });
    expect(mipDamageRect({ minx: 0, miny: 0, maxx: 99, maxy: 99 }, 1, 10, 10))
      .toEqual({ x: 0, y: 0, width: 10, height: 10 });
    expect(mipDamageRect({ minx: 40, miny: 40, maxx: 41, maxy: 41 }, 1, 10, 10)).toBeNull();
  });

  it("unions pending damage", () => {
    expect(unionMipBounds(null, { minx: 1, miny: 2, maxx: 3, maxy: 4 }))
      .toEqual({ minx: 1, miny: 2, maxx: 3, maxy: 4 });
    expect(unionMipBounds({ minx: 1, miny: 2, maxx: 3, maxy: 4 },
      { minx: 0, miny: 5, maxx: 2, maxy: 9 }))
      .toEqual({ minx: 0, miny: 2, maxx: 3, maxy: 9 });
  });
});
