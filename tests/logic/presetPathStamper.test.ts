import { describe, expect, it, vi } from "vitest";
import type { LoadedBrush } from "../../src/contracts/brush.ts";
import { createPresetPathStamper } from "../../src/systems/draw/preset-path.ts";

vi.mock("../../src/core/brush/renderBrushDab.ts", () => ({
  visitBrushDab: (_brush: unknown, sample: { x: number; y: number },
    _settings: unknown, paint: (x: number, y: number, o: number) => void) =>
    paint(sample.x, sample.y, 1)
}));

const brush = { strokePath: { spacing: 1 } } as unknown as LoadedBrush;
const stamps = (points: readonly (readonly [number, number])[], size: number) => {
  const seen: string[] = [];
  const stamper = createPresetPathStamper(brush,
    { size, opacity: 1, erase: false }, (x, y) => seen.push(`${x},${y}`));
  for (const [x, y] of points) stamper.at(x, y);
  return seen;
};

describe("preset dabs along a geometric path", () => {
  it("always stamps the first point", () => {
    expect(stamps([[3, 4]], 10)).toEqual(["3.5,4.5"]);
  });

  it("skips points closer than the preset spacing", () => {
    const walk = Array.from({ length: 12 }, (_, index) => [index, 0] as const);
    expect(stamps(walk, 10)).toEqual(["0.5,0.5", "10.5,0.5"]);
  });

  it("stamps every point when the brush is small enough", () => {
    expect(stamps([[0, 0], [1, 0], [2, 0]], 1)).toHaveLength(3);
  });

  it("stamps again after a jump in the path", () => {
    expect(stamps([[0, 0], [1, 0], [80, 40]], 10))
      .toEqual(["0.5,0.5", "80.5,40.5"]);
  });
});
