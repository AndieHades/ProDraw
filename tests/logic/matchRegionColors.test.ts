import { describe, expect, it } from "vitest";
import { visitRegionColorMatches } from "../../src/logic/raster/matchRegionColors.ts";

function region(width: number, height: number, pixels: readonly (readonly number[])[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach((pixel, index) => data.set(pixel, index * 4));
  return { minx: 10, miny: 20, width, height, data };
}
const collect = (r: ReturnType<typeof region>, colors: readonly (readonly number[])[]) => {
  const hits: string[] = [];
  visitRegionColorMatches(r, colors, (x, y) => hits.push(`${x},${y}`));
  return hits;
};

describe("region colour matching", () => {
  it("reports matches in document coordinates", () => {
    const source = region(2, 2, [[9, 8, 7, 255], [1, 2, 3, 255],
      [1, 2, 3, 128], [4, 4, 4, 255]]);
    expect(collect(source, [[1, 2, 3]])).toEqual(["11,20", "10,21"]);
  });

  it("compares red, green and blue only and ignores alpha differences", () => {
    const source = region(1, 2, [[5, 6, 7, 255], [5, 6, 7, 1]]);
    expect(collect(source, [[5, 6, 7, 255]])).toEqual(["10,20", "10,21"]);
  });

  it("treats a fully transparent sample as an absent cell", () => {
    const source = region(1, 1, [[0, 0, 0, 0]]);
    expect(collect(source, [[0, 0, 0]])).toEqual([]);
  });

  it("accepts several colours and ignores malformed ones", () => {
    const source = region(3, 1, [[1, 1, 1, 255], [2, 2, 2, 255], [3, 3, 3, 255]]);
    expect(collect(source, [[1, 1, 1], [3, 3, 3]])).toEqual(["10,20", "12,20"]);
    expect(collect(source, [[1, 1]])).toEqual([]);
    expect(collect(source, [])).toEqual([]);
  });
});
