import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import type { CoverageMap } from "../../contracts/brush";

const tiles = new WeakMap<object, Map<number, CoverageMap>>();

function targetSide(source: number, scale: number): number {
  return Math.max(1, Math.min(source,
    Math.round(source * Math.max(0.05, scale) / rasterConfig.grainScaleDivisor)));
}

function horizontal(map: CoverageMap, width: number): Float32Array<ArrayBuffer> {
  const output = new Float32Array(width * map.height);
  for (let y = 0; y < map.height; y += 1) {
    const sourceRow = y * map.width;
    const targetRow = y * width;
    for (let x = 0; x < width; x += 1) {
      const start = Math.floor(x * map.width / width);
      const end = Math.max(start + 1, Math.floor((x + 1) * map.width / width));
      let sum = 0;
      for (let sourceX = start; sourceX < end; sourceX += 1) {
        sum += map.data[sourceRow + sourceX] ?? 0;
      }
      output[targetRow + x] = sum / (end - start);
    }
  }
  return output;
}

/** Area-filtered periodic tile used by Procreate grain on the raster canvas. */
export function logicalGrainTile(map: CoverageMap, scale: number): CoverageMap {
  const cached = tiles.get(map)?.get(scale); if (cached) return cached;
  const reference = map.scaleReference ?? Math.max(map.width, map.height);
  const ratio = targetSide(reference, scale) / reference;
  const width = Math.max(1, Math.round(map.width * ratio));
  const height = Math.max(1, Math.round(map.height * ratio));
  if (width === map.width && height === map.height) return map;
  const rows = horizontal(map, width);
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const start = Math.floor(y * map.height / height);
    const end = Math.max(start + 1, Math.floor((y + 1) * map.height / height));
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let sourceY = start; sourceY < end; sourceY += 1) {
        sum += rows[sourceY * width + x] ?? 0;
      }
      data[y * width + x] = Math.round(sum / (end - start));
    }
  }
  const result = { width, height, data };
  let variants = tiles.get(map);
  if (!variants) { variants = new Map(); tiles.set(map, variants); }
  variants.set(scale, result); return result;
}
