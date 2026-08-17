import type { BrushPreset, CoverageMap, LoadedBrush } from "../../contracts/brush";
import { logicalGrainTile } from "./grainTile.ts";
import { sampleCoverage, sampleTile } from "./coverageSampling.ts";
import { DEFAULT_GRAIN, DEFAULT_SHAPE } from "../../config/brushDefaults.ts";

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

export interface BrushTipTransform {
  readonly rotation?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly flipX?: boolean;
  readonly flipY?: boolean;
}

export interface BrushTextureTransform {
  readonly centerX: number;
  readonly centerY: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly depthScale?: number;
}

export interface BrushCoverageSampler {
  readonly tip: (normalizedX: number, normalizedY: number,
    transform?: BrushTipTransform) => number;
  readonly texture: (x: number, y: number, transform?: BrushTextureTransform) => number;
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
  const shapeSettings = { ...DEFAULT_SHAPE, ...brush.shape };
  const grainSettings = { ...DEFAULT_GRAIN, ...brush.grain };
  const radialBuiltIn = /brush-preset-(?:hard|soft)/i.test(shapeSettings.sourceName ?? "");
  const blankGrain = /brush-preset-blank/i.test(grainSettings.sourceName ?? "");
  const shape = radialBuiltIn ? null : shapeOf(brush);
  const nativeGrain = "grainMap" in brush ? brush.grainMap : null;
  const roundness = Math.max(0.05, shapeSettings.roundness);
  const exponent = 1 + (1 - shapeSettings.hardness) * 2;
  const edge = Math.max(0.001, 1 - shapeSettings.hardness);
  const strength = blankGrain ? 0 : grainSettings.strength;
  const scale = Math.max(0.05, grainSettings.scale);
  const grain = nativeGrain && !blankGrain ? logicalGrainTile(nativeGrain, scale) : null;
  const seed = brushSeed(brush.id);
  const haggard = /haggard-oval/i.test(shapeSettings.sourceName ?? "");
  const sampler: BrushCoverageSampler = {
    textured: !(strength <= 0),
    radialEdge: !shape && !haggard && shapeSettings.angle === 0 && roundness === 1
      ? edge : null,
    textureWidth: grain?.width ?? 0,
    textureHeight: grain?.height ?? 0,
    tip: (normalizedX, normalizedY, transform = {}) => {
      const angle = shapeSettings.angle + (transform.rotation ?? 0);
      const cosine = Math.cos(angle), sine = Math.sin(angle);
      const sourceX = normalizedX * (transform.flipX ? -1 : 1) /
        Math.max(0.05, transform.scaleX ?? 1);
      const sourceY = normalizedY * (transform.flipY ? -1 : 1) /
        Math.max(0.05, transform.scaleY ?? 1);
      const transformedX = sourceX * cosine + sourceY * sine;
      const transformedY = (-sourceX * sine + sourceY * cosine) / roundness;
      if (Math.abs(transformedX) > 1 || Math.abs(transformedY) > 1) return 0;
      if (shape) return Math.pow(sampleCoverage(shape, (transformedX + 1) / 2,
        (transformedY + 1) / 2, shapeSettings.filtering), exponent);
      const distance = proceduralDistance(haggard, transformedX, transformedY, seed);
      return distance >= 1 ? 0 : Math.min(1, Math.max(0, (1 - distance) / edge));
    },
    texture: (x, y, transform) => {
      if (strength <= 0) return 1;
      const centerX = transform?.centerX ?? 0, centerY = transform?.centerY ?? 0;
      const localX = x - centerX, localY = y - centerY;
      const moving = grainSettings.behavior === "moving";
      const movement = moving ? grainSettings.movement : 0;
      const sourceX = x * (1 - movement) + localX * movement + (transform?.offsetX ?? 0);
      const sourceY = y * (1 - movement) + localY * movement + (transform?.offsetY ?? 0);
      const cosine = Math.cos(grainSettings.rotation), sine = Math.sin(grainSettings.rotation);
      const zoom = Math.max(0.05, grainSettings.zoom);
      const fallbackScale = grain ? 1 : scale;
      const sampleX = (sourceX * cosine + sourceY * sine) / (zoom * fallbackScale);
      const sampleY = (-sourceX * sine + sourceY * cosine) / (zoom * fallbackScale);
      const sample = grain
        ? sampleTile(grain, sampleX, sampleY, grainSettings.filtering)
        : ((((Math.floor(sampleX) * 73856093) ^ (Math.floor(sampleY) * 19349663) ^
          seed) >>> 0) % 997) / 996;
      const contrast = 1 + grainSettings.contrast * 2;
      const adjusted = Math.max(0, Math.min(1,
        (sample - 0.5) * contrast + 0.5 + grainSettings.brightness * 0.5));
      const depth = Math.max(grainSettings.minimumDepth,
        strength * (transform?.depthScale ?? 1));
      return 1 - depth + adjusted * depth;
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
