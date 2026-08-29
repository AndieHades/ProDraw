import { clampRound } from "./math.ts";
import type { ColorChannels } from "./color.ts";

export function bcAdjust(color: ColorChannels, brightness: number,
  factor: number): number[] {
  const apply = (value: number): number =>
    clampRound(factor * (value - 128) + 128 + brightness, 0, 255);
  const output = [apply(color[0] ?? 0), apply(color[1] ?? 0), apply(color[2] ?? 0)];
  if (color.length > 3) output.push(color[3] ?? 0);
  return output;
}

export const contrastFactor = (contrast: number): number =>
  (259 * (contrast + 255)) / (255 * (259 - contrast));
