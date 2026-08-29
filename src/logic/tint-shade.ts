import { hsvToRgb, rgbToHsv } from "./color.ts";
import type { ColorChannels, RgbColor } from "./color.ts";
import { HARMONY_OFFSETS, TINT_SHADE_STEPS } from "../config/tint-shade.ts";

type HarmonyType = keyof typeof HARMONY_OFFSETS;
const tintChannel = (channel: number, amount: number): number =>
  Math.round(channel + (255 - channel) * amount);
const shadeChannel = (channel: number, amount: number): number =>
  Math.round(channel * (1 - amount));
const apply = (base: ColorChannels, transform: (channel: number, amount: number) =>
  number, amount: number): RgbColor => [transform(base[0] ?? 0, amount),
  transform(base[1] ?? 0, amount), transform(base[2] ?? 0, amount)];
const scale = (base: ColorChannels, transform: (channel: number, amount: number) =>
  number): RgbColor[] => [[base[0] ?? 0, base[1] ?? 0, base[2] ?? 0],
  ...TINT_SHADE_STEPS.map((amount) => apply(base, transform, amount))];

export const generateTints = (base: ColorChannels): RgbColor[] =>
  scale(base, tintChannel);
export const generateShades = (base: ColorChannels): RgbColor[] =>
  scale(base, shadeChannel);

export function generateHarmonyBaseColors(base: ColorChannels,
  type: HarmonyType | string): RgbColor[] {
  const [hue, saturation, value] = rgbToHsv(base[0] ?? 0, base[1] ?? 0, base[2] ?? 0);
  const offsets = type in HARMONY_OFFSETS ? HARMONY_OFFSETS[type as HarmonyType] : [];
  return offsets.map((offset) => hsvToRgb(hue + offset, saturation, value));
}

export function generateTintShadeScalesForHarmony(base: ColorChannels,
  type: HarmonyType | string): Array<{ base: RgbColor; tints: RgbColor[];
    shades: RgbColor[] }> {
  return generateHarmonyBaseColors(base, type).map((color) => ({
    base: color, tints: generateTints(color), shades: generateShades(color)
  }));
}
