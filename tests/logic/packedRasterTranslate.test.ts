import { describe, expect, it } from "vitest";
import type { PackedRgbaGridRecord,
  PackedRgbaRowRecord } from "../../src/contracts/packedRgbaGrid.ts";
import { createPackedRgbaGrid,
  packedRgbaStats } from "../../src/logic/raster/PackedRgbaGrid.ts";
import { translateRaster } from "../../src/logic/raster-remap.ts";

type Pixel = readonly [number, number, number, number];
const rgba = (red: number): Pixel => [red, 2, 3, 255];

// Строка кодируется байтами от `left`; прозрачные пиксели внутри допустимы —
// именно так упакованный растр приходит из PSD.
function row(y: number, left: number, cells: readonly (Pixel | null)[]):
PackedRgbaRowRecord {
  const bytes = new Uint8ClampedArray(cells.length * 4);
  let opaquePixels = 0;
  cells.forEach((cell, index) => {
    if (!cell) return;
    bytes.set(cell, index * 4); opaquePixels++;
  });
  return { y, left, bytes, opaquePixels };
}

function packed(width: number, height: number,
  rows: readonly PackedRgbaRowRecord[]): unknown[] {
  let minx = width, miny = height, maxx = -1, maxy = -1, opaquePixels = 0;
  for (const item of rows) {
    opaquePixels += item.opaquePixels;
    minx = Math.min(minx, item.left); miny = Math.min(miny, item.y);
    maxx = Math.max(maxx, item.left + item.bytes.length / 4 - 1);
    maxy = Math.max(maxy, item.y);
  }
  const record: PackedRgbaGridRecord = { format: "rgba-rows-v1", width, height,
    rows, bounds: maxx < 0 ? null : { minx, miny, maxx, maxy }, opaquePixels };
  const grid = createPackedRgbaGrid(record);
  if (!grid) throw new Error("packed grid fixture failed");
  return grid;
}

const cellsOf = (grid: unknown, width: number, height: number) => {
  const rows = grid as (Pixel | null)[][], out: string[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = rows[y]?.[x]; if (cell) out.push(`${x},${y}=${cell[0]}`);
  }
  return out;
};

describe("packed raster translation", () => {
  it("shifts rows and keeps the result packed instead of per-pixel cells", () => {
    const grid = packed(4, 3, [row(1, 1, [rgba(10), rgba(11), rgba(12)])]);
    const result = translateRaster(grid as never, new Map(), -1, -1, 2, 2,
      { preserveGrid: true });

    expect(packedRgbaStats(result.grid)).toMatchObject({ storedCells: 2 });
    expect(cellsOf(result.grid, 2, 2)).toEqual(["0,0=10", "1,0=11"]);
    expect(result.bounds).toEqual({ minx: 0, miny: 0, maxx: 1, maxy: 0 });
    // уехавшее за правый край сохраняется в запасе, как и в общем пути
    expect(result.ext.get("2,0")).toEqual(rgba(12));
    // источник не тронут
    expect(cellsOf(grid, 4, 3)).toEqual(["1,1=10", "2,1=11", "3,1=12"]);
  });

  it("keeps exact bounds for rows padded with transparent edges", () => {
    const grid = packed(6, 2, [row(0, 1, [null, rgba(20), null, rgba(21), null])]);
    const result = translateRaster(grid as never, new Map(), 0, 0, 6, 2, {});

    expect(cellsOf(result.grid, 6, 2)).toEqual(["2,0=20", "4,0=21"]);
    expect(result.bounds).toEqual({ minx: 2, miny: 0, maxx: 4, maxy: 0 });
  });

  it("sends rows pushed off the canvas to the outside store", () => {
    const grid = packed(3, 3, [row(2, 0, [rgba(30), rgba(31)])]);
    const result = translateRaster(grid as never, new Map(), 0, 1, 3, 3, {});

    expect(packedRgbaStats(result.grid)).toMatchObject({ storedCells: 0 });
    expect(result.bounds).toBeNull();
    expect([result.ext.get("0,3"), result.ext.get("1,3")])
      .toEqual([rgba(30), rgba(31)]);
  });

  it("lets the stored grid win over returning content when preserving it", () => {
    const make = () => packed(3, 2, [row(0, 0, [rgba(40)])]);
    const ext = () => new Map<string, Pixel>([["0,0", rgba(41)]]);

    const kept = translateRaster(make() as never, ext(), 0, 0, 3, 2,
      { preserveGrid: true });
    expect(cellsOf(kept.grid, 3, 2)).toEqual(["0,0=40"]);

    const overwritten = translateRaster(make() as never, ext(), 0, 0, 3, 2, {});
    expect(cellsOf(overwritten.grid, 3, 2)).toEqual(["0,0=41"]);
    expect(overwritten.bounds).toEqual({ minx: 0, miny: 0, maxx: 0, maxy: 0 });
  });
});
