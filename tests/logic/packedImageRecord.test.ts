import { describe, expect, it } from "vitest";
import { packedImageRecord,
  placePackedImage } from "../../src/logic/raster/packedImageRecord";
import { PackedRasterExt } from "../../src/logic/raster/PackedRasterExt";
import { translateRaster } from "../../src/logic/raster-remap";

const WIDTH = 7, HEIGHT = 5;
// Alpha 0, 1, 7 and 8 sit around the old alpha < 8 cut-off of the editor insert.
const alphaAt = (x: number, y: number): number => [0, 1, 7, 8, 128, 255][(x + y) % 6]!;

function image(): Uint8ClampedArray {
  const bytes = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++)
    bytes.set([x * 30, y * 50, x + y, alphaAt(x, y)], (y * WIDTH + x) * 4);
  return bytes;
}
const expected = (bytes: Uint8ClampedArray, x: number, y: number) => {
  const offset = (y * WIDTH + x) * 4;
  return bytes[offset + 3] ? [...bytes.subarray(offset, offset + 4)] : null;
};

describe("packed image placement", () => {
  it("records each row as one span with exact alpha", () => {
    const record = packedImageRecord(WIDTH, HEIGHT, image());
    expect(record.rows).toHaveLength(HEIGHT);
    expect(record.opaquePixels).toBe(WIDTH * HEIGHT - 6);
    expect(record.bounds).toEqual({ minx: 0, miny: 0, maxx: 6, maxy: 4 });
  });

  it("splits an image larger than the canvas into grid and packed ext", () => {
    const bytes = image(), left = -2, top = -1;
    const placed = placePackedImage(WIDTH, HEIGHT, bytes, left, top, 4, 3);
    expect(placed.ext).toBeInstanceOf(PackedRasterExt);
    const grid = placed.grid as unknown[][];
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const px = x + left, py = y + top;
      const inside = px >= 0 && py >= 0 && px < 4 && py < 3;
      const actual = inside ? grid[py]![px] : placed.ext.get(`${px},${py}`) ?? null;
      expect(actual).toEqual(expected(bytes, x, y));
    }
    const restored = translateRaster(placed.grid as never, placed.ext, -left, -top,
      WIDTH, HEIGHT, { preserveGrid: true });
    expect(restored.ext.size).toBe(0);
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++)
      expect(restored.grid[y]![x] ?? null).toEqual(expected(bytes, x, y));
  });

  it("centres a smaller image without off-canvas pixels", () => {
    const bytes = image();
    const placed = placePackedImage(WIDTH, HEIGHT, bytes, 2, 3, 11, 11);
    expect(placed.ext.size).toBe(0);
    expect(placed.bounds).toEqual({ minx: 2, miny: 3, maxx: 8, maxy: 7 });
    expect((placed.grid as unknown[][])[3]![2]).toBeNull();
    expect((placed.grid as unknown[][])[3]![3]).toEqual([30, 0, 1, 1]);
  });
});
