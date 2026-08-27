import { describe, expect, it } from "vitest";
import { cloneGridIdle } from "../../src/systems/gallery/record-clone";
// @ts-expect-error Legacy raster bridge is JavaScript until the R2.11 cutover.
import { blank, sparseGridStats } from "../../src/logic/raster";

describe("legacy A4 autosave work", () => {
  it("clones a blank or sparse A4 without yielding through empty rows", async () => {
    const grid = blank(2480, 3508);
    grid[1700]![1200] = [10, 20, 30, 255];
    grid[1700]![1201] = [10, 20, 30, 255];
    let yields = 0;
    const output = await cloneGridIdle(grid, undefined, () => true,
      async () => { yields += 1; });

    expect(yields).toBe(0);
    expect(output?.[1700]?.[1200]).toEqual([10, 20, 30, 255]);
    expect(output?.[1700]?.[1201]).toBe(output?.[1700]?.[1200]);
    expect(sparseGridStats(output)).toMatchObject({ width: 2480, height: 3508,
      materializedRows: 1, storedCells: 2 });
  });

  it("clones an A4 grid in cancellable row chunks", async () => {
    type Cell = number[] | null | undefined;
    const empty = { length: 2480 } as unknown as Cell[];
    const grid = new Array<Cell[]>(3508).fill(empty);
    const painted = { length: 2480,
      1200: [10, 20, 30, 255] } as unknown as Cell[];
    grid[1700] = painted;
    let yields = 0;
    const output = await cloneGridIdle(grid,
      { minx: 1200, miny: 1700, maxx: 1200, maxy: 1700 }, () => true,
      async () => { yields += 1; });

    expect(output).not.toBeNull();
    expect(output).toHaveLength(3508);
    expect(output?.[0]).toHaveLength(2480);
    expect(output?.[1700]?.[1200]).toEqual([10, 20, 30, 255]);
    expect(yields).toBe(Math.floor(3508 / 8));
  });

  it("clones persisted sparse PSD rows without yielding through array holes", async () => {
    type Cell = number[] | null | undefined;
    const grid = new Array<Cell[]>(578);
    const lower = new Array<Cell>(265), upper = new Array<Cell>(265);
    lower[12] = [10, 20, 30, 255]; upper[219] = [10, 20, 30, 255];
    upper[220] = [40, 50, 60, 128];
    grid[20] = lower; grid[540] = upper;
    let yields = 0;
    const output = await cloneGridIdle(grid, undefined, () => true,
      async () => { yields += 1; });

    expect(yields).toBe(0);
    expect(output).toHaveLength(578);
    expect(Object.keys(output ?? {})).toEqual(["20", "540"]);
    expect(output?.[20]?.[12]).toEqual([10, 20, 30, 255]);
    expect(output?.[540]?.[219]).toBe(output?.[20]?.[12]);
    expect(output?.[540]?.[220]).toEqual([40, 50, 60, 128]);
  });

  it("abandons A4 cloning at the first yield after pen input starts", async () => {
    type Cell = number[] | null | undefined;
    const row = { length: 2480 } as unknown as Cell[];
    const grid = new Array<Cell[]>(3508).fill(row);
    let current = true, yields = 0;
    const output = await cloneGridIdle(grid, undefined, () => current,
      async () => { yields += 1; current = false; });

    expect(output).toBeNull();
    expect(yields).toBe(1);
  });
});
