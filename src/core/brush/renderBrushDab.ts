import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { BrushRenderSettings, StrokeSample } from "../../contracts/stroke";
import { brushCoverageSampler } from "../../logic/brush/brushCoverage.ts";
import type { RasterEdit } from "../history/RasterEdit";
import { visitRadialDab } from "./radialDab.ts";
import { brushDabOpacity } from "../../logic/brush/brushOpacity.ts";
import { dabStampPlan } from "../../logic/brush/dabStampPlan.ts";
import { DEFAULT_PROPERTIES } from "../../config/brushDefaults.ts";
import { responseCurve } from "../../logic/brush/responseCurve.ts";

export type BrushDabVisitor = (x: number, y: number, opacity: number) => void;

export function pressureBrushSize(
  brush: BrushPreset | LoadedBrush,
  size: number,
  sample: Pick<StrokeSample, "pressure" | "tiltX" | "tiltY" | "sizeScale">
): number {
  const curved = responseCurve(sample.pressure, brush.dynamics.pressureSizeCurve);
  const response = 1 - brush.dynamics.sizeByPressure +
    brush.dynamics.sizeByPressure * curved;
  const tilt = brush.stylus.tiltEnabled
    ? Math.min(1, Math.hypot(sample.tiltX, sample.tiltY) / 90) : 0;
  const responsiveSize = size * response * (1 + brush.dynamics.tiltToSize * tilt) *
    (sample.sizeScale ?? 1);
  return Math.max(brush.properties.minimumSize ?? DEFAULT_PROPERTIES.minimumSize,
    Math.min(brush.properties.maximumSize ?? DEFAULT_PROPERTIES.maximumSize, responsiveSize));
}

export function renderBrushDab(
  edit: RasterEdit,
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  settings: BrushRenderSettings,
  color: RgbaColor
): void {
  visitBrushDab(brush, sample, settings, (x, y, opacity) => {
    if (settings.erase) edit.erasePixel(x, y, opacity);
    else edit.blendPixel(x, y, color, opacity);
  });
}

export function visitBrushDab(
  brush: BrushPreset | LoadedBrush,
  sample: StrokeSample,
  settings: BrushRenderSettings,
  visit: BrushDabVisitor
): void {
  const size = pressureBrushSize(brush, settings.size, sample);
  const radius = size / 2;
  const sampler = brushCoverageSampler(brush);
  const baseOpacity = brushDabOpacity(brush, sample, settings.opacity);
  if (baseOpacity <= 0) return;
  for (const stamp of dabStampPlan(brush, sample, size)) {
    const maximumScale = Math.max(stamp.scaleX, stamp.scaleY);
    const stampRadius = radius * maximumScale;
    const bounds = [Math.floor(stamp.x - stampRadius - 1),
      Math.ceil(stamp.x + stampRadius + 1), Math.floor(stamp.y - stampRadius - 1),
      Math.ceil(stamp.y + stampRadius + 1)] as const;
    if (sampler.radialEdge !== null && !sampler.textured &&
        stamp.scaleX === 1 && stamp.scaleY === 1) {
      visitRadialDab({ ...sample, x: stamp.x, y: stamp.y }, radius, bounds,
        sampler.radialEdge, baseOpacity, visit);
      continue;
    }
    for (let y = bounds[2]; y <= bounds[3]; y += 1) {
      const normalizedY = (y + 0.5 - stamp.y) / radius;
      for (let x = bounds[0]; x <= bounds[1]; x += 1) {
        const normalizedX = (x + 0.5 - stamp.x) / radius;
        const coverage = sampler.tip(normalizedX, normalizedY, stamp);
        if (coverage <= 0) continue;
        const texture = sampler.textured ? sampler.texture(x, y, {
          centerX: stamp.x, centerY: stamp.y, offsetX: stamp.grainOffsetX,
          offsetY: stamp.grainOffsetY, depthScale: stamp.grainDepthScale }) : 1;
        const opacity = baseOpacity * coverage * texture;
        if (opacity > 0) visit(x, y, opacity);
      }
    }
  }
}
