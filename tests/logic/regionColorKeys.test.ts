import { describe, expect, it } from "vitest";
import { EMPTY_COLOR_KEY, colorKeyOf,
  regionColorKeys } from "../../src/logic/raster/regionColorKeys.ts";

describe("region colour keys", () => {
  it("packs red, green and blue and marks absent pixels", () => {
    const data = new Uint8ClampedArray(12);
    data.set([1, 2, 3, 255], 0); data.set([1, 2, 3, 7], 4); data.set([1, 2, 3, 0], 8);
    const keys = regionColorKeys({ minx: 0, miny: 0, width: 3, height: 1, data });
    expect([...keys]).toEqual([0x010203, 0x010203, EMPTY_COLOR_KEY]);
  });

  it("agrees with the cell packing used for grids", () => {
    expect(colorKeyOf([1, 2, 3])).toBe(0x010203);
    expect(colorKeyOf([1, 2, 3, 7])).toBe(0x010203);
    expect(colorKeyOf(null)).toBe(EMPTY_COLOR_KEY);
    expect(colorKeyOf(undefined)).toBe(EMPTY_COLOR_KEY);
  });

  it("separates different colours and joins equal ones", () => {
    const data = new Uint8ClampedArray(8);
    data.set([10, 0, 0, 255], 0); data.set([0, 10, 0, 255], 4);
    const keys = regionColorKeys({ minx: 0, miny: 0, width: 2, height: 1, data });
    expect(keys[0]).not.toBe(keys[1]);
  });
});
