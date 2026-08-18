import type { CoverageMap } from "../../contracts/brush";

interface Adjustment {
  readonly brightness: number;
  readonly contrast: number;
  readonly mean: number;
}

const means = new WeakMap<object, Adjustment[]>();

export function adjustGrain(value: number, brightness: number,
  contrast: number): number {
  const multiplier = 1 + contrast * 2;
  return Math.max(0, Math.min(1,
    (value - 0.5) * multiplier + 0.5 + brightness * 0.5));
}

export function adjustedGrainMean(map: CoverageMap, brightness: number,
  contrast: number): number {
  const cached = means.get(map)?.find((entry) =>
    entry.brightness === brightness && entry.contrast === contrast);
  if (cached) return cached.mean;
  let total = 0;
  for (const value of map.data) total += adjustGrain(value / 255, brightness, contrast);
  const mean = map.data.length > 0 ? total / map.data.length : 1;
  const variants = means.get(map) ?? [];
  variants.push({ brightness, contrast, mean }); means.set(map, variants);
  return mean;
}
