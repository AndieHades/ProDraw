// Карта формы кисти крупнее отпечатка: пятьсот двенадцать текселей ложатся в
// шестьдесят пикселей. Одна выборка на пиксель отбрасывает всё, что между
// ними, и край выходит рваным — на кривой это ступени. Пирамида уменьшенных
// копий даёт усреднение, а выбор уровня по масштабу — переход между размерами
// кисти без скачка.
import type { BrushFilteringMode, CoverageMap } from "../../contracts/brush.ts";
import { sampleCoverage } from "./coverageSampling.ts";

export type CoverageMips = readonly CoverageMap[];

function halve(map: CoverageMap): CoverageMap {
  const width = Math.max(1, map.width >> 1);
  const height = Math.max(1, map.height >> 1);
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const top = Math.min(map.height - 1, y * 2) * map.width;
    const bottom = Math.min(map.height - 1, y * 2 + 1) * map.width;
    for (let x = 0; x < width; x += 1) {
      const left = Math.min(map.width - 1, x * 2);
      const right = Math.min(map.width - 1, x * 2 + 1);
      data[y * width + x] = ((map.data[top + left] ?? 0) +
        (map.data[top + right] ?? 0) + (map.data[bottom + left] ?? 0) +
        (map.data[bottom + right] ?? 0) + 2) >> 2;
    }
  }
  return { width, height, data };
}

export function buildCoverageMips(map: CoverageMap): CoverageMips {
  const levels: CoverageMap[] = [map];
  let current = map;
  while (current.width > 1 || current.height > 1) {
    current = halve(current); levels.push(current);
  }
  return levels;
}

// `texelsPerPixel` — сколько текселей исходной карты приходится на один пиксель
// отпечатка.
export function sampleCoverageMips(levels: CoverageMips, x: number, y: number,
  texelsPerPixel: number, filtering: BrushFilteringMode): number {
  const finest = levels[0];
  if (!finest) return 0;
  if (!(texelsPerPixel > 1) || levels.length === 1) {
    return sampleCoverage(finest, x, y, filtering);
  }
  const depth = Math.min(levels.length - 1, Math.log2(texelsPerPixel));
  const lower = Math.floor(depth);
  const near = sampleCoverage(levels[lower] ?? finest, x, y, filtering);
  const blend = depth - lower;
  if (blend <= 0) return near;
  const coarse = levels[Math.min(levels.length - 1, lower + 1)] ?? finest;
  return near + (sampleCoverage(coarse, x, y, filtering) - near) * blend;
}
