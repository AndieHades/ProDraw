import type { LoadedBrush } from "../../contracts/brush";
import { brushCoverageSampler } from "./brushCoverage";

export interface LegacyBrushMap {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8Array<ArrayBuffer>;
}

export interface LegacyBrushStamp {
  readonly coverage: LegacyBrushMap;
  readonly grain: LegacyBrushMap | null;
  readonly opacity: number;
  readonly params: { readonly mode: "single" | "scatter";
    readonly spacing: number; readonly jitter: number; readonly sizeJitter: number };
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const stampCache = new WeakMap<LoadedBrush, LegacyBrushStamp>();

function coverageMap(brush: LoadedBrush, size = 64): LegacyBrushMap {
  const data = new Uint8Array(size * size);
  const sampler = brushCoverageSampler(brush);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const nx = ((x + 0.5) / size) * 2 - 1;
    const ny = ((y + 0.5) / size) * 2 - 1;
    data[y * size + x] = Math.round(clamp01(sampler.tip(nx, ny)) * 255);
  }
  return { w: size, h: size, data };
}

function grainMap(brush: LoadedBrush, size = 32): LegacyBrushMap | null {
  const strength = clamp01(brush.grain.strength);
  if (strength < 0.02) return null;
  const data = new Uint8Array(size * size);
  const floor = 1 - strength;
  const threshold = 0.16 + strength * 0.48;
  const sampler = brushCoverageSampler(brush);
  let enabled = 0;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const texture = sampler.texture(x, y);
    const normalized = clamp01((texture - floor) / strength);
    const value = normalized >= threshold ? 1 : 0;
    data[y * size + x] = value; enabled += value;
  }
  return enabled === 0 || enabled === data.length ? null : { w: size, h: size, data };
}

export function legacyBrushStamp(brush: LoadedBrush): LegacyBrushStamp {
  const cached = stampCache.get(brush);
  if (cached) return cached;
  const jitter = Math.max(brush.strokePath.scatter, brush.strokePath.lateralJitter);
  const shapeScatter = brush.shape.scatter > 0.015 || brush.shape.count > 1;
  const sizeJitter = Math.max(brush.strokePath.spacingJitter,
    brush.strokePath.linearJitter * 0.5);
  const stamp: LegacyBrushStamp = {
    coverage: coverageMap(brush), grain: grainMap(brush),
    opacity: Math.max(0.04, clamp01(brush.rendering.flow * brush.rendering.opacity)),
    params: { mode: shapeScatter || jitter > 0.015 || sizeJitter > 0.01
      ? "scatter" : "single",
      spacing: Math.max(0.01, brush.strokePath.spacing), jitter, sizeJitter }
  };
  stampCache.set(brush, stamp);
  return stamp;
}
