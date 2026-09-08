import type { BrushPreset, CoverageMap, LoadedBrush } from "../../contracts/brush";
import type { BrushTipTransform } from "../../contracts/brushSampling.ts";
export type { BrushTipTransform } from "../../contracts/brushSampling.ts";
import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import { sampleTile } from "./coverageSampling.ts";
import { prepareBrushTip } from "./prepareBrushTip.ts";
import { DEFAULT_GRAIN, DEFAULT_SHAPE } from "../../config/brushDefaults.ts";
import { adjustGrain, adjustedGrainMean } from "./grainAdjustment.ts";

function shapeOf(brush: BrushPreset | LoadedBrush): CoverageMap | null {
  return "shapeMap" in brush ? brush.shapeMap : null;
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
  readonly prepareTip: (transform?: BrushTipTransform) => (x: number, y: number) => number;
  readonly prepareTexture: (transform?: BrushTextureTransform) => (x: number, y: number) => number;
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
  const prepareTip = (transform: BrushTipTransform = {}) =>
    prepareBrushTip(shape, shapeSettings, transform);
  const prepareTexture = (transform?: BrushTextureTransform) => {
    const movement = grainSettings.behavior === "moving" ? grainSettings.movement : 0;
    const offsetX = (transform?.offsetX ?? 0) - (transform?.centerX ?? 0) * movement;
    const offsetY = (transform?.offsetY ?? 0) - (transform?.centerY ?? 0) * movement;
    const ratio = grain && reference > 0 ? grain.width / reference : 1;
    const coordinateScale = ratio / (Math.max(0.05, grainSettings.zoom) * physicalScale);
    const cosine = Math.cos(grainSettings.rotation) * coordinateScale;
    const sine = Math.sin(grainSettings.rotation) * coordinateScale;
    const depth = Math.max(grainSettings.minimumDepth, strength * (transform?.depthScale ?? 1));
    return (x: number, y: number): number => {
      if (strength <= 0 || !grain) return 1;
      const sx = x + offsetX, sy = y + offsetY;
      const value = sampleTile(grain, sx * cosine + sy * sine,
        -sx * sine + sy * cosine, grainSettings.filtering);
      return Math.max(0, 1 + (adjustGrain(value, grainSettings.brightness,
        grainSettings.contrast) - grainMean) * depth);
    };
  };
  const sampler: BrushCoverageSampler = {
    textured: strength > 0 && Boolean(grain),
    radialEdge: !shape && shapeSettings.angle === 0 && roundness === 1
      ? edge : null,
    textureWidth: Math.round(physicalWidth),
    textureHeight: Math.round(physicalHeight),
    prepareTip, prepareTexture,
    tip: (x, y, transform) => prepareTip(transform)(x, y),
    texture: (x, y, transform) => prepareTexture(transform)(x, y)
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
