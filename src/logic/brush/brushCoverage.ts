import type { BrushPreset, CoverageMap, LoadedBrush } from "../../contracts/brush";
import { logicalGrainTile } from "./grainTile.ts";

function shapeOf(brush: BrushPreset | LoadedBrush): CoverageMap | null {
  return "shapeMap" in brush ? brush.shapeMap : null;
}

function brushSeed(id: string): number {
  let seed = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    seed ^= id.charCodeAt(index); seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function proceduralDistance(haggard: boolean, x: number, y: number,
  seed: number): number {
  if (haggard) {
    const angle = Math.atan2(y, x), ripple = Math.sin(angle * 7 + seed % 31) * 0.06;
    return Math.hypot(x, y * 1.35) * (1 + ripple);
  }
  return Math.hypot(x, y);
}

function bilinear(map: CoverageMap, x: number, y: number): number {
  const mapX = Math.max(0, Math.min(map.width - 1, x * (map.width - 1)));
  const mapY = Math.max(0, Math.min(map.height - 1, y * (map.height - 1)));
  const left = Math.floor(mapX);
  const top = Math.floor(mapY);
  const right = Math.min(map.width - 1, left + 1);
  const bottom = Math.min(map.height - 1, top + 1);
  const fractionX = mapX - left;
  const fractionY = mapY - top;
  const topValue = (map.data[top * map.width + left] ?? 0) * (1 - fractionX) +
    (map.data[top * map.width + right] ?? 0) * fractionX;
  const bottomValue = (map.data[bottom * map.width + left] ?? 0) * (1 - fractionX) +
    (map.data[bottom * map.width + right] ?? 0) * fractionX;
  return (topValue * (1 - fractionY) + bottomValue * fractionY) / 255;
}

export interface BrushCoverageSampler {
  readonly tip: (normalizedX: number, normalizedY: number) => number;
  readonly texture: (x: number, y: number) => number;
  readonly textured: boolean;
  readonly radialEdge: number | null;
  readonly textureWidth: number;
  readonly textureHeight: number;
}

const samplers = new WeakMap<object, BrushCoverageSampler>();

export function brushCoverageSampler(
  brush: BrushPreset | LoadedBrush
): BrushCoverageSampler {
  const cached = samplers.get(brush); if (cached) return cached;
  const shape = shapeOf(brush);
  const nativeGrain = "grainMap" in brush ? brush.grainMap : null;
  const cosine = Math.cos(brush.shape.angle);
  const sine = Math.sin(brush.shape.angle);
  const roundness = Math.max(0.05, brush.shape.roundness);
  const exponent = 1 + (1 - brush.shape.hardness) * 2;
  const edge = Math.max(0.001, 1 - brush.shape.hardness);
  const strength = brush.grain.strength;
  const scale = Math.max(0.05, brush.grain.scale);
  const grain = nativeGrain ? logicalGrainTile(nativeGrain, scale) : null;
  const seed = brushSeed(brush.id);
  const haggard = /haggard-oval/i.test(brush.shape.sourceName ?? "");
  const sampler: BrushCoverageSampler = {
    textured: !(strength <= 0),
    radialEdge: !shape && !haggard && cosine === 1 && sine === 0 && roundness === 1
      ? edge : null,
    textureWidth: grain?.width ?? 0,
    textureHeight: grain?.height ?? 0,
    tip: (normalizedX, normalizedY) => {
      const transformedX = normalizedX * cosine + normalizedY * sine;
      const transformedY = (-normalizedX * sine + normalizedY * cosine) / roundness;
      if (Math.abs(transformedX) > 1 || Math.abs(transformedY) > 1) return 0;
      if (shape) return Math.pow(bilinear(shape, (transformedX + 1) / 2,
        (transformedY + 1) / 2), exponent);
      const distance = proceduralDistance(haggard, transformedX, transformedY, seed);
      return distance >= 1 ? 0 : Math.min(1, Math.max(0, (1 - distance) / edge));
    },
    texture: (x, y) => {
      if (strength <= 0) return 1;
      const sampleX = Math.floor(grain ? x : x / scale);
      const sampleY = Math.floor(grain ? y : y / scale);
      const sample = grain
        ? (grain.data[((sampleY % grain.height + grain.height) % grain.height) *
          grain.width + ((sampleX % grain.width + grain.width) % grain.width)] ?? 0) / 255
        : ((((sampleX * 73856093) ^ (sampleY * 19349663) ^ seed) >>> 0) % 997) / 996;
      return 1 - strength + sample * strength;
    }
  };
  samplers.set(brush, sampler); return sampler;
}

export function brushTipCoverage(
  brush: BrushPreset | LoadedBrush,
  normalizedX: number,
  normalizedY: number
): number {
  return brushCoverageSampler(brush).tip(normalizedX, normalizedY);
}

export function brushTexture(
  brush: BrushPreset | LoadedBrush,
  x: number,
  y: number
): number {
  return brushCoverageSampler(brush).texture(x, y);
}
