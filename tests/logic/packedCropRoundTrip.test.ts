import { expect, it } from "vitest";
import { blank } from "../../src/logic/raster.ts";
import { remapRaster, translateRaster } from "../../src/logic/raster-remap.ts";
import { createPackedRgbaGrid } from "../../src/logic/raster/PackedRgbaGrid.ts";
import { packedRgbaRecordFromBitmap } from "../../src/logic/raster/packedRgbaRecord.ts";

it("matches the pixel oracle across crops, expansion, holes, alpha and returning ext", () => {
  const width = 13, height = 9, bytes = new Uint8ClampedArray(width * height * 4);
  const grid = blank(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if ((x + y) % 3 === 0) continue;
    const cell = [x * 7, y * 11, 123, (x + y) % 2 ? 64 : 255];
    bytes.set(cell, (y * width + x) * 4); grid[y]![x] = cell;
  }
  const packed = createPackedRgbaGrid(packedRgbaRecordFromBitmap(width, height,
    { left: 0, top: 0, width, height, rgba: bytes }));
  let actual = { grid: packed as never, ext: new Map<string, readonly number[]>(), bounds: null };
  let oracle = { grid: grid as never, ext: new Map<string, readonly number[]>(), bounds: null };
  for (const [dx, dy, w, h] of [[-4, -3, 3, 2], [-1, 2, 4, 5], [5, 1, 13, 9],
    [20, -20, 2, 2], [-20, 20, 13, 9]] as const) {
    actual = translateRaster(actual.grid, actual.ext, dx, dy, w, h,
      { preserveGrid: true }) as typeof actual;
    oracle = remapRaster(oracle.grid, oracle.ext, w, h, (x, y) => [x + dx, y + dy],
      { preserveGrid: true }) as typeof oracle;
    expect(actual.bounds).toEqual(oracle.bounds);
    expect(new Map(actual.ext)).toEqual(oracle.ext);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      expect(actual.grid[y]?.[x] ?? null).toEqual(oracle.grid[y]?.[x] ?? null);
  }
});
