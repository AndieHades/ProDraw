import { describe, expect, it } from "vitest";
import { ViewportMipChain } from "../../src/core/render/ViewportMipChain.ts";

type Draw = { target: string; source: string; args: number[] };

function fakeCanvases() {
  const draws: Draw[] = [], clears: Array<{ target: string; args: number[] }> = [];
  const canvas = (name: string, width: number, height: number) => {
    const element = { name, width, height, getContext: () => context };
    const context = { imageSmoothingEnabled: false, imageSmoothingQuality: "high",
      clearRect: (...args: number[]) => clears.push({ target: name, args }),
      drawImage: (source: { name: string }, ...args: number[]) =>
        draws.push({ target: name, source: source.name, args }) };
    return element as unknown as HTMLCanvasElement;
  };
  let created = 0;
  const create = (width: number, height: number) => canvas(`L${++created}`, width, height);
  return { draws, clears, canvas, create };
}

describe("viewport mip chain", () => {
  it("returns the composite itself while the view is not strongly reduced", () => {
    const fake = fakeCanvases(), chain = new ViewportMipChain(fake.create);
    const base = fake.canvas("base", 9, 5);
    expect(chain.source(base, 9, 5, 0)).toEqual({ image: base, width: 9, height: 5 });
    expect(fake.draws).toEqual([]);
  });

  it("builds requested levels lazily by exact halving and reuses them", () => {
    const fake = fakeCanvases(), chain = new ViewportMipChain(fake.create);
    const base = fake.canvas("base", 9, 5), mip = chain.source(base, 9, 5, 2);
    expect(mip).toMatchObject({ width: 2.25, height: 1.25 });
    expect(fake.draws).toEqual([
      { target: "L1", source: "base", args: [0, 0, 9, 5, 0, 0, 4.5, 2.5] },
      { target: "L2", source: "L1", args: [0, 0, 5, 3, 0, 0, 2.5, 1.5] }]);
    chain.source(base, 9, 5, 2); chain.source(base, 9, 5, 1);
    expect(fake.draws).toHaveLength(2);
  });

  it("refreshes only the damaged rectangle of valid levels", () => {
    const fake = fakeCanvases(), chain = new ViewportMipChain(fake.create);
    const base = fake.canvas("base", 16, 16);
    chain.source(base, 16, 16, 2); fake.draws.length = 0; fake.clears.length = 0;
    chain.invalidate({ minx: 5, miny: 4, maxx: 6, maxy: 4 });
    chain.source(base, 16, 16, 2);
    expect(fake.clears.map(({ target, args }) => [target, ...args]))
      .toEqual([["L1", 2, 2, 2, 1], ["L2", 1, 1, 1, 1]]);
    expect(fake.draws.map(({ target, args }) => [target, ...args]))
      .toEqual([["L1", 4, 4, 4, 2, 2, 2, 2, 1], ["L2", 2, 2, 2, 2, 1, 1, 1, 1]]);
  });

  it("rebuilds every level after a full composite repaint or resize", () => {
    const fake = fakeCanvases(), chain = new ViewportMipChain(fake.create);
    const base = fake.canvas("base", 8, 8);
    chain.source(base, 8, 8, 1); chain.invalidate(); chain.source(base, 8, 8, 1);
    expect(fake.draws.map(({ args }) => args.slice(6))).toEqual([[4, 4], [4, 4]]);
    const wider = fake.canvas("base", 12, 8); chain.source(wider, 12, 8, 1);
    expect(fake.draws.at(-1)).toMatchObject({ target: "L2", args: [0, 0, 12, 8, 0, 0, 6, 4] });
  });
});
