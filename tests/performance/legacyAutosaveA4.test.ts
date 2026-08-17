import { describe, expect, it } from "vitest";
import { cloneGridIdle } from "../../src/systems/gallery/record-clone";

describe("legacy A4 autosave work", () => {
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
