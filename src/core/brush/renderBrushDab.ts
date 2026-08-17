import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { BrushRenderSettings, StrokeSample } from "../../contracts/stroke";
import { brushCoverageSampler } from "../../logic/brush/brushCoverage.ts";
import type { RasterEdit } from "../history/RasterEdit";
import { visitRadialDab } from "./radialDab.ts";

export type BrushDabVisitor = (x: number, y: number, opacity: number) => void;

export function pressureBrushSize(
  brush: BrushPreset | LoadedBrush,
  size: number,
  sample: Pick<StrokeSample, "pressure" | "tiltX" | "tiltY">
): number {
  const response = 1 - brush.dynamics.sizeByPressure +
    brush.dynamics.sizeByPressure * sample.pressure;
  const tilt = brush.stylus.tiltEnabled
    ? Math.min(1, Math.hypot(sample.tiltX, sample.tiltY) / 90) : 0;
  const responsiveSize = size * response * (1 + brush.dynamics.tiltToSize * tilt);
  return Math.max(brush.properties.minimumSize,
    Math.min(brush.properties.maximumSize, responsiveSize));
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
  const minimumX = Math.floor(sample.x - radius - 1);
  const maximumX = Math.ceil(sample.x + radius + 1);
  const minimumY = Math.floor(sample.y - radius - 1);
  const maximumY = Math.ceil(sample.y + radius + 1);
  const pressureOpacity = 1 - brush.dynamics.opacityByPressure +
    brush.dynamics.opacityByPressure * sample.pressure;
  const sampler = brushCoverageSampler(brush);
  const baseOpacity = settings.opacity * brush.rendering.opacity *
    brush.rendering.flow * pressureOpacity;
  if (baseOpacity <= 0) return;
  if (sampler.radialEdge !== null && !sampler.textured) {
    visitRadialDab(sample, radius, [minimumX, maximumX, minimumY, maximumY],
      sampler.radialEdge, baseOpacity, visit);
    return;
  }
  for (let y = minimumY; y <= maximumY; y += 1) {
    const normalizedY = (y + 0.5 - sample.y) / radius;
    for (let x = minimumX; x <= maximumX; x += 1) {
      const normalizedX = (x + 0.5 - sample.x) / radius;
      const coverage = sampler.tip(normalizedX, normalizedY);
      if (coverage <= 0) continue;
      const opacity = baseOpacity * coverage *
        (sampler.textured ? sampler.texture(x, y) : 1);
      if (opacity > 0) visit(x, y, opacity);
    }
  }
}
