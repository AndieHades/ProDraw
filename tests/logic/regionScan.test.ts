import { describe, expect, it } from "vitest";
import { packRegionToInt32, someOpaqueRegionPixel,
  visitOpaqueRegionPixels } from "../../src/logic/raster/regionScan.ts";

function region(width: number, height: number, pixels: readonly (readonly number[])[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach((pixel, index) => data.set(pixel, index * 4));
  return { minx: 3, miny: 5, width, height, data };
}

describe("region scanning", () => {
  it("reports opaque pixels in document coordinates", () => {
    const seen: string[] = [];
    visitOpaqueRegionPixels(region(2, 2, [[0, 0, 0, 0], [1, 1, 1, 4],
      [0, 0, 0, 0], [2, 2, 2, 255]]), (x, y) => seen.push(`${x},${y}`));
    expect(seen).toEqual(["4,5", "4,6"]);
  });

  it("stops at the first accepted opaque pixel", () => {
    const asked: string[] = [];
    const found = someOpaqueRegionPixel(
      region(2, 1, [[1, 1, 1, 255], [2, 2, 2, 255]]),
      (x, y) => { asked.push(`${x},${y}`); return x === 3; });
    expect(found).toBe(true);
    expect(asked).toEqual(["3,5"]);
  });

  it("never asks about transparent pixels and reports nothing when all are transparent", () => {
    const asked: string[] = [];
    const found = someOpaqueRegionPixel(region(2, 1, [[9, 9, 9, 0], [8, 8, 8, 0]]),
      (x, y) => { asked.push(`${x},${y}`); return true; });
    expect(found).toBe(false);
    expect(asked).toEqual([]);
  });

  it("handles an empty region", () => {
    const empty = { minx: 0, miny: 0, width: 0, height: 0, data: new Uint8ClampedArray(0) };
    expect(someOpaqueRegionPixel(empty, () => true)).toBe(false);
    visitOpaqueRegionPixels(empty, () => { throw new Error("must not visit"); });
  });
});

describe("region to integer packing", () => {
  it("packs opaque samples as 0xRRGGBBAA at their document offset", () => {
    const data = new Uint8ClampedArray(8);
    data.set([1, 2, 3, 255], 0); data.set([0, 0, 0, 0], 4);
    const target = new Int32Array(16);
    packRegionToInt32({ minx: 1, miny: 2, width: 2, height: 1, data }, target, 4);
    expect((target[2 * 4 + 1] ?? 0) >>> 0).toBe(0x010203ff);
    expect(target[2 * 4 + 2]).toBe(0);
  });

  it("leaves the target untouched for a transparent region", () => {
    const target = new Int32Array(4).fill(7);
    packRegionToInt32({ minx: 0, miny: 0, width: 2, height: 1,
      data: new Uint8ClampedArray(8) }, target, 2);
    expect([...target]).toEqual([7, 7, 7, 7]);
  });
});
