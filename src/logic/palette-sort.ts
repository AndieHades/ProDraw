import { rgbToHsv } from "./color.ts";
import type { ColorChannels } from "./color.ts";

const HUE_STEP = 30;
const GRAY_SATURATION = 12;
const HUE_ORDER = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
const luminance = (color: ColorChannels): number =>
  0.299 * (color[0] ?? 0) + 0.587 * (color[1] ?? 0) + 0.114 * (color[2] ?? 0);
const hueBin = (hue: number): number => Math.round(hue / HUE_STEP) % (360 / HUE_STEP);
const hueRank = (hue: number): number => HUE_ORDER.indexOf(hueBin(hue));

export function sortPalette<T extends ColorChannels>(colors: readonly T[]): T[] {
  const items = colors.map((color) => {
    const [hue, saturation] = rgbToHsv(color[0] ?? 0, color[1] ?? 0, color[2] ?? 0);
    return { color, hue, saturation };
  });
  const gray = items.filter((item) => item.saturation < GRAY_SATURATION)
    .sort((a, b) => luminance(a.color) - luminance(b.color));
  const chroma = items.filter((item) => item.saturation >= GRAY_SATURATION)
    .sort((a, b) => hueRank(a.hue) - hueRank(b.hue) ||
      luminance(a.color) - luminance(b.color));
  return [...chroma, ...gray].map((item) => item.color);
}
