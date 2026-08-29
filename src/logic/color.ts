export type ColorChannels = readonly number[];
export type RgbColor = readonly [number, number, number];

const channel = (color: ColorChannels, index: number): number => color[index] ?? 0;

export const hexToRgb = (hex: string): RgbColor => {
  const source = hex.replace("#", "");
  const parse = (index: number): number =>
    Number.parseInt(source.slice(index, index + 2), 16);
  return [parse(0), parse(2), parse(4)];
};
export const rgb = (color: ColorChannels): string =>
  `rgb(${channel(color, 0)},${channel(color, 1)},${channel(color, 2)})`;
export const rgbToHex = (color: ColorChannels): string => "#" + [0, 1, 2]
  .map((index) => channel(color, index).toString(16).padStart(2, "0")).join("");
export const eqc = (a: ColorChannels | null | undefined,
  b: ColorChannels | null | undefined): boolean => !!a && !!b &&
  channel(a, 0) === channel(b, 0) && channel(a, 1) === channel(b, 1) &&
  channel(a, 2) === channel(b, 2);

export const colorDist2 = (a: ColorChannels, b: ColorChannels): number =>
  (channel(a, 0) - channel(b, 0)) ** 2 + (channel(a, 1) - channel(b, 1)) ** 2 +
  (channel(a, 2) - channel(b, 2)) ** 2;
export function farthestColor(ref: ColorChannels,
  candidates: readonly ColorChannels[]): ColorChannels | undefined {
  let best = candidates[0]; let distance = -1;
  for (const candidate of candidates) {
    const next = colorDist2(ref, candidate);
    if (next > distance) { distance = next; best = candidate; }
  }
  return best;
}

export function rgbToHsv(red: number, green: number, blue: number): RgbColor {
  const r = red / 255, g = green / 255, b = blue / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60; if (hue < 0) hue += 360;
  }
  return [hue, max ? (delta / max) * 100 : 0, max * 100];
}

export function hsvToRgb(hue: number, saturation: number, value: number): RgbColor {
  const s = saturation / 100, v = value / 100;
  const h = ((hue % 360) + 360) % 360;
  const chroma = v * s, x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const match = v - chroma; let r = 0, g = 0, b = 0;
  if (h < 60) { r = chroma; g = x; } else if (h < 120) { r = x; g = chroma; }
  else if (h < 180) { g = chroma; b = x; } else if (h < 240) { g = x; b = chroma; }
  else if (h < 300) { r = x; b = chroma; } else { r = chroma; b = x; }
  return [Math.round((r + match) * 255), Math.round((g + match) * 255),
    Math.round((b + match) * 255)];
}
