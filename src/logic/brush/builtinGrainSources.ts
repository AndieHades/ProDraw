import type { CoverageMap } from "../../contracts/brush";

const side = 256;
const noise = (x: number, y: number, seed: number): number => {
  let value = Math.imul(x + seed, 1597334677) ^ Math.imul(y - seed, 3812015801);
  value = Math.imul(value ^ (value >>> 15), 2246822519);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
};
const smooth = (x: number, y: number, scale: number, seed: number): number =>
  noise(Math.floor(x / scale), Math.floor(y / scale), seed);

function map(sample: (x: number, y: number) => number): CoverageMap {
  const data = new Uint8Array(side * side);
  for (let y = 0; y < side; y += 1) for (let x = 0; x < side; x += 1) {
    data[y * side + x] = Math.max(0, Math.min(255, Math.round(sample(x, y) * 255)));
  }
  return { width: side, height: side, data, scaleReference: 2048 };
}

const blank = (): CoverageMap => map(() => 1);
const charcoal = (vine: boolean): CoverageMap => map((x, y) => {
  const fine = noise(x, y, vine ? 19 : 11);
  const medium = smooth(x, y, vine ? 5 : 3, vine ? 23 : 13);
  const coarse = smooth(x, y, vine ? 15 : 9, vine ? 29 : 17);
  const value = fine * 0.35 + medium * 0.4 + coarse * 0.25;
  return vine ? Math.pow(value, 1.35) : Math.pow(value, 0.82);
});
const cotton = (): CoverageMap => map((x, y) => {
  const fibres = Math.abs(Math.sin((x * 0.21 + y * 0.07) + smooth(x, y, 13, 31) * 4));
  const cross = Math.abs(Math.sin((y * 0.17 - x * 0.035) + smooth(x, y, 17, 37) * 3));
  return 0.48 + fibres * 0.28 + cross * 0.18 + noise(x, y, 41) * 0.06;
});

export function builtInGrainSource(name: string): CoverageMap | null {
  if (/brush-preset-blank/i.test(name)) return blank();
  if (/brush-artery-charcoal-corse/i.test(name)) return charcoal(false);
  if (/brush-artery-charcoal-vine/i.test(name)) return charcoal(true);
  if (/cotton-paper/i.test(name)) return cotton();
  return null;
}
