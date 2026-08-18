import type { BrushPreset, CoverageMap, LoadedBrush } from "../../contracts/brush";
import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import { sampleCoverage, sampleTile } from "./coverageSampling.ts";
import { DEFAULT_GRAIN, DEFAULT_SHAPE } from "../../config/brushDefaults.ts";
import { adjustGrain, adjustedGrainMean } from "./grainAdjustment.ts";

function shapeOf(brush: BrushPreset | LoadedBrush): CoverageMap | null {
  return "shapeMap" in brush ? brush.shapeMap : null;
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
  const blankGrain = /brush-preset-blank/i.test(grainSettings.sourceName ?? "");
  const shape = shapeOf(brush);
  const nativeGrain = "grainMap" in brush ? brush.grainMap : null;
  const roundness = Math.max(0.05, shapeSettings.roundness);
  const edge = Math.max(0.001, 1 - shapeSettings.hardness);
  const strength = blankGrain ? 0 : grainSettings.strength;
  const scale = Math.max(0.05, grainSettings.scale);
  const grain = nativeGrain && !blankGrain ? nativeGrain : null;
  const grainMean = grain ? adjustedGrainMean(grain, grainSettings.brightness,
    grainSettings.contrast) : 1;
  const reference = grain?.scaleReference ?? grain?.width ?? 0;
  const physicalScale = scale * rasterConfig.grainScaleCalibration;
  const physicalWidth = reference * physicalScale * Math.max(0.05, grainSettings.zoom);
  const physicalHeight = reference > 0 && grain
    ? physicalWidth * grain.height / grain.width : 0;
  const sampler: BrushCoverageSampler = {
    textured: strength > 0 && Boolean(grain),
    radialEdge: !shape && shapeSettings.angle === 0 && roundness === 1
      ? edge : null,
    textureWidth: Math.round(physicalWidth),
    textureHeight: Math.round(physicalHeight),
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
      if (shape) return sampleCoverage(shape, (transformedX + 1) / 2,
        (transformedY + 1) / 2, shapeSettings.filtering);
      const distance = Math.hypot(transformedX, transformedY);
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
      const decodedRatio = grain && reference > 0 ? grain.width / reference : 1;
      const coordinateScale = zoom * physicalScale;
      const sampleX = (sourceX * cosine + sourceY * sine) * decodedRatio / coordinateScale;
      const sampleY = (-sourceX * sine + sourceY * cosine) * decodedRatio / coordinateScale;
      const sample = grain ? sampleTile(grain, sampleX, sampleY,
        grainSettings.filtering) : 1;
      const adjusted = adjustGrain(sample, grainSettings.brightness,
        grainSettings.contrast);
      const depth = Math.max(grainSettings.minimumDepth,
        strength * (transform?.depthScale ?? 1));
      return Math.max(0, 1 + (adjusted - grainMean) * depth);
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
