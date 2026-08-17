import type { LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { pressureBrushSize, visitBrushDab } from "./renderBrushDab.ts";
import { brushCoverageSampler } from "../../logic/brush/brushCoverage.ts";
import cursorConfig from "../../config/cursor-mask.json" with { type: "json" };
import { brushDabOpacity } from "../../logic/brush/brushOpacity.ts";
import { dabStampPlan } from "../../logic/brush/dabStampPlan.ts";

export interface BrushCursorMask {
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly data: Uint8Array<ArrayBuffer>;
}

interface CursorCacheEntry {
  readonly key: string;
  readonly mask: BrushCursorMask;
}

const cursorMasks = new WeakMap<LoadedBrush, CursorCacheEntry>();
const fraction = (value: number): number => Math.round((value - Math.floor(value)) * 16);
const modulo = (value: number, period: number): number =>
  period > 0 ? ((Math.floor(value) % period) + period) % period : 0;

export function brushCursorMask(
  brush: LoadedBrush,
  size: number,
  sample: StrokeSample
): BrushCursorMask {
  const actualSize = pressureBrushSize(brush, size, sample);
  const radius = actualSize / 2;
  const stamps = dabStampPlan(brush, sample, actualSize);
  const left = Math.min(...stamps.map((stamp) =>
    Math.floor(stamp.x - radius * Math.max(stamp.scaleX, stamp.scaleY) - 1)));
  const right = Math.max(...stamps.map((stamp) =>
    Math.ceil(stamp.x + radius * Math.max(stamp.scaleX, stamp.scaleY) + 1)));
  const top = Math.min(...stamps.map((stamp) =>
    Math.floor(stamp.y - radius * Math.max(stamp.scaleX, stamp.scaleY) - 1)));
  const bottom = Math.max(...stamps.map((stamp) =>
    Math.ceil(stamp.y + radius * Math.max(stamp.scaleX, stamp.scaleY) + 1)));
  const exactWidth = right - left + 1;
  const exactHeight = bottom - top + 1;
  const scale = Math.max(1, Math.max(exactWidth, exactHeight) /
    cursorConfig.maximumSide);
  const width = Math.ceil(exactWidth / scale);
  const height = Math.ceil(exactHeight / scale);
  const sampler = brushCoverageSampler(brush);
  const phase = sampler.textureWidth > 0
    ? `${modulo(sample.x, sampler.textureWidth)},${modulo(sample.y, sampler.textureHeight)}`
    : "plain";
  const key = `${brush.revision}|${size}|${sample.pressure}|${sample.tiltX},${sample.tiltY}|` +
    `${fraction(sample.x)},${fraction(sample.y)}|${phase}|${width}x${height}`;
  const cached = cursorMasks.get(brush);
  if (cached?.key === key) return cached.mask;
  const data = new Uint8Array(width * height);
  if (scale > 1) {
    const baseOpacity = brushDabOpacity(brush, sample, 1);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const documentX = left + (x + 0.5) * scale;
      const documentY = top + (y + 0.5) * scale;
      let alpha = 0;
      for (const stamp of stamps) {
        const coverage = sampler.tip((documentX - stamp.x) / radius,
          (documentY - stamp.y) / radius, stamp);
        if (coverage <= 0) continue;
        const texture = sampler.texture(documentX, documentY, {
          centerX: stamp.x, centerY: stamp.y, offsetX: stamp.grainOffsetX,
          offsetY: stamp.grainOffsetY, depthScale: stamp.grainDepthScale });
        const opacity = Math.max(0, Math.min(1, baseOpacity * coverage * texture));
        alpha = opacity + alpha * (1 - opacity);
      }
      data[y * width + x] = Math.round(alpha * 255);
    }
    const mask = { width, height, offsetX: left - sample.x,
      offsetY: top - sample.y, scale, data };
    cursorMasks.set(brush, { key, mask }); return mask;
  }
  visitBrushDab(brush, sample, { size, opacity: 1, erase: false },
    (x, y, opacity) => {
      const index = (y - top) * width + x - left;
      data[index] = Math.max(data[index] ?? 0,
        Math.round(Math.max(0, Math.min(1, opacity)) * 255));
    });
  const mask = { width, height, offsetX: left - sample.x,
    offsetY: top - sample.y, scale, data };
  cursorMasks.set(brush, { key, mask }); return mask;
}
