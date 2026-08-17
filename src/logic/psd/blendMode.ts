import type { PsdBlendMode } from "../../contracts/psdImport.ts";

type Rgb = readonly [number, number, number];
type Rgba = readonly [number, number, number, number];
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const lum = (c: Rgb): number => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const sat = (c: Rgb): number => Math.max(...c) - Math.min(...c);

function clipColor(value: Rgb): Rgb {
  const l = lum(value), low = Math.min(...value), high = Math.max(...value);
  let c = [...value] as [number, number, number];
  if (low < 0) c = c.map((v) => l + ((v - l) * l) / (l - low)) as typeof c;
  if (high > 1) c = c.map((v) => l + ((v - l) * (1 - l)) / (high - l)) as typeof c;
  return c.map(clamp) as [number, number, number];
}

const setLum = (c: Rgb, value: number): Rgb => {
  const delta = value - lum(c);
  return clipColor(c.map((v) => v + delta) as [number, number, number]);
};

function setSat(c: Rgb, value: number): Rgb {
  const result = [0, 0, 0], order = [0, 1, 2].sort((a, b) => c[a]! - c[b]!);
  const low = order[0]!, middle = order[1]!, high = order[2]!;
  if (c[high]! > c[low]!) {
    result[middle] = ((c[middle]! - c[low]!) * value) / (c[high]! - c[low]!);
    result[high] = value;
  }
  return result as [number, number, number];
}

const burn = (b: number, s: number): number => s <= 0 ? 0 : 1 - Math.min(1, (1 - b) / s);
const dodge = (b: number, s: number): number => s >= 1 ? 1 : Math.min(1, b / (1 - s));
const overlay = (b: number, s: number): number => b <= 0.5
  ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
const soft = (b: number, s: number): number => s <= 0.5
  ? b - (1 - 2 * s) * b * (1 - b)
  : b + (2 * s - 1) * ((b <= 0.25
    ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b);

function channel(mode: PsdBlendMode, b: number, s: number): number {
  const values: Partial<Record<PsdBlendMode, () => number>> = {
    darken: () => Math.min(b, s), multiply: () => b * s,
    "color burn": () => burn(b, s), "linear burn": () => Math.max(0, b + s - 1),
    lighten: () => Math.max(b, s), screen: () => b + s - b * s,
    "color dodge": () => dodge(b, s), "linear dodge": () => Math.min(1, b + s),
    overlay: () => overlay(b, s), "soft light": () => soft(b, s),
    "hard light": () => overlay(s, b),
    "vivid light": () => s <= 0.5 ? burn(b, 2 * s) : dodge(b, 2 * s - 1),
    "linear light": () => clamp(b + 2 * s - 1),
    "pin light": () => s <= 0.5 ? Math.min(b, 2 * s) : Math.max(b, 2 * s - 1),
    "hard mix": () => channel("vivid light", b, s) < 0.5 ? 0 : 1,
    difference: () => Math.abs(b - s), exclusion: () => b + s - 2 * b * s,
    subtract: () => Math.max(0, b - s), subtraction: () => Math.max(0, b - s),
    divide: () => s <= 0 ? 1 : Math.min(1, b / s),
    "linear height": () => clamp(b + s - 0.5), height: () => overlay(b, s),
  };
  return clamp(values[mode]?.() ?? s);
}

export function blendRgb(backdrop: Rgb, source: Rgb, mode: PsdBlendMode): Rgb {
  if (mode === "hue") return setLum(setSat(source, sat(backdrop)), lum(backdrop));
  if (mode === "saturation") return setLum(setSat(backdrop, sat(source)), lum(backdrop));
  if (mode === "color") return setLum(source, lum(backdrop));
  if (mode === "luminosity") return setLum(backdrop, lum(source));
  if (mode === "darker color") return lum(source) < lum(backdrop) ? source : backdrop;
  if (mode === "lighter color") return lum(source) > lum(backdrop) ? source : backdrop;
  return backdrop.map((value, index) => channel(mode, value, source[index]!)) as unknown as Rgb;
}

const noise = (x: number, y: number): number => {
  let value = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y, 0xc2b2ae35);
  value ^= value >>> 16; return (value >>> 0) / 0x100000000;
};

export function blendPixel(backdrop: Rgba, source: Rgba, opacity: number,
  mode: PsdBlendMode, x = 0, y = 0): Rgba {
  const b = backdrop.slice(0, 3).map((v) => v / 255) as unknown as Rgb;
  const s = source.slice(0, 3).map((v) => v / 255) as unknown as Rgb;
  const ab = backdrop[3] / 255; let as = source[3] / 255 * clamp(opacity);
  let activeMode = mode === "pass through" ? "normal" : mode;
  if (activeMode === "dissolve") { as = noise(x, y) < as ? 1 : 0; activeMode = "normal"; }
  const mixed = blendRgb(b, s, activeMode), ao = as + ab * (1 - as);
  if (ao <= 0) return [0, 0, 0, 0];
  const rgb = mixed.map((value, index) => ((1 - as) * ab * b[index]! +
    (1 - ab) * as * s[index]! + ab * as * value) / ao);
  return [...rgb.map((v) => Math.round(clamp(v) * 255)),
    Math.round(ao * 255)] as unknown as Rgba;
}

export function blendRgba(target: Uint8ClampedArray, source: Uint8ClampedArray,
  width: number, opacity: number, mode: PsdBlendMode, originX = 0, originY = 0): void {
  for (let offset = 0; offset < target.length; offset += 4) {
    const index = offset / 4;
    const pixel = blendPixel(target.slice(offset, offset + 4) as unknown as Rgba,
      source.slice(offset, offset + 4) as unknown as Rgba, opacity, mode,
      originX + index % width, originY + Math.floor(index / width));
    target.set(pixel, offset);
  }
}
