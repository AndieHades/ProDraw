import type { BrushFilteringMode, CoverageMap } from "../../contracts/brush";

const clampIndex = (value: number, maximum: number): number =>
  Math.max(0, Math.min(maximum, value));
const pixel = (map: CoverageMap, x: number, y: number): number =>
  (map.data[clampIndex(y, map.height - 1) * map.width +
    clampIndex(x, map.width - 1)] ?? 0) / 255;
const mix = (left: number, right: number, amount: number): number =>
  left + (right - left) * amount;

export function sampleCoverage(map: CoverageMap, x: number, y: number,
  filtering: BrushFilteringMode): number {
  const mapX = clampIndex(x, 1) * (map.width - 1);
  const mapY = clampIndex(y, 1) * (map.height - 1);
  if (filtering === "none") return pixel(map, Math.round(mapX), Math.round(mapY));
  const left = Math.floor(mapX), top = Math.floor(mapY);
  const right = Math.min(map.width - 1, left + 1);
  const bottom = Math.min(map.height - 1, top + 1);
  const rawX = mapX - left, rawY = mapY - top;
  const amountX = filtering === "improved" ? rawX * rawX * (3 - 2 * rawX) : rawX;
  const amountY = filtering === "improved" ? rawY * rawY * (3 - 2 * rawY) : rawY;
  return mix(mix(pixel(map, left, top), pixel(map, right, top), amountX),
    mix(pixel(map, left, bottom), pixel(map, right, bottom), amountX), amountY);
}

const wrappedPixel = (map: CoverageMap, x: number, y: number): number => {
  const wrappedX = ((x % map.width) + map.width) % map.width;
  const wrappedY = ((y % map.height) + map.height) % map.height;
  return (map.data[wrappedY * map.width + wrappedX] ?? 0) / 255;
};

export function sampleTile(map: CoverageMap, x: number, y: number,
  filtering: BrushFilteringMode): number {
  if (filtering === "none") return wrappedPixel(map, Math.floor(x), Math.floor(y));
  const left = Math.floor(x), top = Math.floor(y);
  const rawX = x - left, rawY = y - top;
  const amountX = filtering === "improved" ? rawX * rawX * (3 - 2 * rawX) : rawX;
  const amountY = filtering === "improved" ? rawY * rawY * (3 - 2 * rawY) : rawY;
  return mix(mix(wrappedPixel(map, left, top), wrappedPixel(map, left + 1, top), amountX),
    mix(wrappedPixel(map, left, top + 1), wrappedPixel(map, left + 1, top + 1),
      amountX), amountY);
}
