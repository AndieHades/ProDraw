import type { ColorChannels, RgbColor } from "./color.ts";

export type AdjustBrushMode = "dodge" | "burn" | "mono" | string;
const channel = (color: ColorChannels, index: number): number => color[index] ?? 0;
const mix = (from: number, to: number, amount: number): number =>
  Math.max(0, Math.min(255, Math.round(from + (to - from) * amount)));
const grayscale = (color: ColorChannels): RgbColor => {
  const value = Math.round(channel(color, 0) * 0.299 + channel(color, 1) * 0.587 +
    channel(color, 2) * 0.114);
  return [value, value, value];
};
export function adjustBrushColor(source: ColorChannels, mode: AdjustBrushMode,
  active: ColorChannels, strengthPercent: number): [number, number, number, number] {
  let target: ColorChannels = active;
  if (mode === "dodge") target = [255, 255, 255];
  else if (mode === "burn") target = [0, 0, 0];
  else if (mode === "mono") target = grayscale(source);
  const amount = Math.max(0, Math.min(1, strengthPercent / 100));
  return [mix(channel(source, 0), channel(target, 0), amount),
    mix(channel(source, 1), channel(target, 1), amount),
    mix(channel(source, 2), channel(target, 2), amount),
    source.length > 3 ? channel(source, 3) : 255];
}
