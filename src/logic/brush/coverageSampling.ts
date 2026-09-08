import type { BrushFilteringMode, CoverageMap } from "../../contracts/brush";

const clampIndex = (value: number, maximum: number): number =>
  Math.max(0, Math.min(maximum, value));
const mix = (left: number, right: number, amount: number): number =>
  left + (right - left) * amount;

export function sampleCoverage(map: CoverageMap, x: number, y: number,
  filtering: BrushFilteringMode): number {
  const mapX = clampIndex(x, 1) * (map.width - 1);
  const mapY = clampIndex(y, 1) * (map.height - 1);
  if (filtering === "none") return map.data[Math.round(mapY) * map.width + Math.round(mapX)]! / 255;
  const left = Math.floor(mapX), top = Math.floor(mapY);
  const right = Math.min(map.width - 1, left + 1);
  const bottom = Math.min(map.height - 1, top + 1);
  const rawX = mapX - left, rawY = mapY - top;
  const amountX = filtering === "improved" ? rawX * rawX * (3 - 2 * rawX) : rawX;
  const amountY = filtering === "improved" ? rawY * rawY * (3 - 2 * rawY) : rawY;
  const a = top * map.width, b = bottom * map.width, data = map.data;
  return mix(mix(data[a + left]!, data[a + right]!, amountX),
    mix(data[b + left]!, data[b + right]!, amountX), amountY) / 255;
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
  const lx = ((left % map.width) + map.width) % map.width;
  const ty = ((top % map.height) + map.height) % map.height;
  const rx = lx + 1 === map.width ? 0 : lx + 1;
  const by = ty + 1 === map.height ? 0 : ty + 1;
  const a = ty * map.width, b = by * map.width, data = map.data;
  return mix(mix(data[a + lx]!, data[a + rx]!, amountX),
    mix(data[b + lx]!, data[b + rx]!, amountX), amountY) / 255;
}
