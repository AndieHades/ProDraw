import { describe, expect, it } from "vitest";
import { packFloatFragment } from "../../src/logic/raster/floatFragmentPixels.ts";

const point = (x: number, y: number, cell: readonly number[]) => ({ x, y, cell });

describe("float fragment packing", () => {
  it("packs points into one buffer sized to their bounds", () => {
    const packed = packFloatFragment(
      [point(4, 7, [10, 20, 30, 200]), point(6, 8, [1, 2, 3])], 64, 64);
    expect(packed).not.toBeNull();
    expect({ minx: packed!.minx, miny: packed!.miny,
      width: packed!.width, height: packed!.height })
      .toEqual({ minx: 4, miny: 7, width: 3, height: 2 });
    expect([...packed!.data.slice(0, 4)]).toEqual([10, 20, 30, 200]);
    const second = ((8 - 7) * 3 + (6 - 4)) * 4;
    expect([...packed!.data.slice(second, second + 4)]).toEqual([1, 2, 3, 255]);
  });

  it("leaves untouched cells fully transparent", () => {
    const packed = packFloatFragment([point(0, 0, [9, 9, 9, 255]),
      point(1, 1, [8, 8, 8, 255])], 64, 64)!;
    expect([...packed.data.slice(4, 8)]).toEqual([0, 0, 0, 0]);
  });

  it("drops points outside the document and reports nothing when all are outside", () => {
    const clipped = packFloatFragment([point(-1, 0, [1, 1, 1, 255]),
      point(3, 3, [2, 2, 2, 255]), point(64, 3, [3, 3, 3, 255])], 64, 64)!;
    expect({ minx: clipped.minx, miny: clipped.miny,
      width: clipped.width, height: clipped.height })
      .toEqual({ minx: 3, miny: 3, width: 1, height: 1 });
    expect(packFloatFragment([point(-5, -5, [1, 1, 1, 255])], 64, 64)).toBeNull();
  });
});
