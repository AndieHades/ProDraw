import type { CoverageMap } from "../../src/contracts/brush";
import type { BrushSourceResolver } from "../../src/contracts/brushSourceResolver";

const side = 32;

function map(sample: (x: number, y: number) => number,
  scaleReference = side): CoverageMap {
  const data = new Uint8Array(side * side);
  for (let y = 0; y < side; y += 1) for (let x = 0; x < side; x += 1) {
    data[y * side + x] = Math.round(Math.max(0, Math.min(1, sample(x, y))) * 255);
  }
  return { width: side, height: side, data, scaleReference };
}

export const testShapeMap = map((x, y) => {
  const nx = (x + 0.5) / side * 2 - 1;
  const ny = (y + 0.5) / side * 2 - 1;
  return Math.max(0, 1 - Math.max(Math.abs(nx) / 0.55, Math.abs(ny) / 0.82));
});

export const testGrainMap = map((x, y) =>
  ((x * 17 + y * 29 + ((x ^ y) * 7)) % 31) / 30, 1160);

export const testBrushSourceResolver: BrushSourceResolver = {
  async resolve({ kind }) { return kind === "shape" ? testShapeMap : testGrainMap; }
};
