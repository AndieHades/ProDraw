import { describe, expect, it } from "vitest";
import { CONTENT_FIT } from "../../src/config/content-fit.ts";
import { blank } from "../../src/logic/raster-grid.ts";
import { createPackedRgbaGrid } from "../../src/logic/raster/PackedRgbaGrid.ts";
import { PackedRasterExt } from "../../src/logic/raster/PackedRasterExt.ts";
import { packedRgbaRecordFromBitmap } from "../../src/logic/raster/packedRgbaRecord.ts";
import { meaningfulLayerBounds,
  type ContentFitRules } from "../../src/logic/raster/meaningfulBounds.ts";

type Grid = (number[] | null)[][];
const W = 40, H = 30;
const layer = (ext: Map<string, unknown> | null = null) =>
  ({ grid: blank(W, H) as unknown as Grid, ext });
const dot = (grid: Grid, x: number, y: number, alpha: number) => {
  const row = grid[y]; if (row) row[x] = [10, 20, 30, alpha];
};
function block(grid: Grid, x0: number, y0: number, x1: number, y1: number, alpha = 255) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dot(grid, x, y, alpha);
}
const fit = (layers: ReturnType<typeof layer>[], rules: ContentFitRules = CONTENT_FIT) =>
  meaningfulLayerBounds(layers, rules);
const art = () => { const value = layer(); block(value.grid, 10, 8, 20, 18); return value; };

describe("meaningful content bounds", () => {
  it("drops tiny translucent specks and faint haze around the artwork", () => {
    const value = art();
    dot(value.grid, 1, 1, 90); dot(value.grid, 38, 28, 4);
    block(value.grid, 30, 2, 31, 3, 140);
    block(value.grid, 0, 25, 9, 29, 10);
    expect(fit([value])).toEqual({ minx: 10, miny: 8, maxx: 20, maxy: 18 });
  });

  it("keeps soft brush edges that touch the artwork, even diagonally", () => {
    const value = art();
    dot(value.grid, 21, 13, 40); dot(value.grid, 22, 13, 8); dot(value.grid, 23, 13, 1);
    dot(value.grid, 9, 7, 2); dot(value.grid, 8, 6, 1);
    expect(fit([value])).toEqual({ minx: 8, miny: 6, maxx: 23, maxy: 18 });
  });

  it("keeps opaque details and larger translucent shapes apart from the artwork", () => {
    const value = art();
    dot(value.grid, 2, 2, 255);
    block(value.grid, 30, 20, 36, 26, 120);
    expect(fit([value])).toEqual({ minx: 2, miny: 2, maxx: 36, maxy: 26 });
  });

  it("joins pixels across layers before judging a speck", () => {
    const base = art(), shade = layer();
    dot(shade.grid, 21, 18, 30); dot(shade.grid, 22, 19, 30); dot(shade.grid, 35, 3, 30);
    expect(fit([base, shade])).toEqual({ minx: 10, miny: 8, maxx: 22, maxy: 19 });
  });

  it("falls back to every pixel when the whole content is residue", () => {
    const value = layer(); dot(value.grid, 3, 4, 60); dot(value.grid, 30, 20, 5);
    expect(fit([value])).toEqual({ minx: 3, miny: 4, maxx: 30, maxy: 20 });
    expect(fit([layer()])).toBeNull();
  });

  it("reads packed rows and off-canvas pixels without per-pixel cells", () => {
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) rgba[(y * W + x) * 4 + 3] = 255;
    const ext = new PackedRasterExt();
    ext.addRow({ y: -6, left: -9, opaquePixels: 1,
      bytes: new Uint8ClampedArray([1, 2, 3, 50]) });
    ext.addRow({ y: 10, left: -4, opaquePixels: 4,
      bytes: new Uint8ClampedArray(16).fill(255) });
    ext.set("70,3", [1, 2, 3, 20]);
    const grid = createPackedRgbaGrid(packedRgbaRecordFromBitmap(W, H,
      { left: 0, top: 0, width: W, height: H, rgba })) as unknown as Grid;
    expect(fit([{ grid, ext }])).toEqual({ minx: -4, miny: 5, maxx: 14, maxy: 14 });
  });

  it("keeps the raw bounds when the scan would be too large or noisy", () => {
    const value = art(); dot(value.grid, 1, 1, 90);
    const raw = { minx: 1, miny: 1, maxx: 20, maxy: 18 };
    expect(fit([value], { ...CONTENT_FIT, maxScanPixels: 100 })).toEqual(raw);
    expect(fit([value], { ...CONTENT_FIT, maxScanRuns: 5 })).toEqual(raw);
  });
});
