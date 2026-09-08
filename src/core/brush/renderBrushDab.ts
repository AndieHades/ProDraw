import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { BrushRenderSettings, StrokeSample } from "../../contracts/stroke";
import { brushCoverageSampler } from "../../logic/brush/brushCoverage.ts";
import type { RasterEdit } from "../history/RasterEdit";
import { visitRadialDab } from "./radialDab.ts";
import { brushDabOpacity } from "../../logic/brush/brushOpacity.ts";
import { dabStampPlan } from "../../logic/brush/dabStampPlan.ts";
import { pressureBrushSize } from "../../logic/brush/pressureBrushSize.ts";
import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import { visitSubpixelDab } from "./visitSubpixelDab.ts";

export type BrushDabVisitor = (x: number, y: number, opacity: number) => void;

export { pressureBrushSize } from "../../logic/brush/pressureBrushSize.ts";

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
  const clip = settings.bounds;
  const sampler = brushCoverageSampler(brush);
  const baseOpacity = brushDabOpacity(brush, sample, settings.opacity);
  if (baseOpacity <= 0) return;
  for (const stamp of dabStampPlan(brush, sample, size)) {
    const maximumScale = Math.max(stamp.scaleX, stamp.scaleY);
    const maximumExtent = radius * maximumScale * Math.SQRT2 + 2;
    if (clip && (stamp.x + maximumExtent < clip.minx || stamp.x - maximumExtent > clip.maxx ||
      stamp.y + maximumExtent < clip.miny || stamp.y - maximumExtent > clip.maxy)) continue;
    if (size * maximumScale <= rasterConfig.subpixelDab.maximumDiameter) {
      visitSubpixelDab(sampler, stamp, size, baseOpacity, (x, y, alpha) => {
        if (!clip || (x >= clip.minx && x <= clip.maxx && y >= clip.miny && y <= clip.maxy))
          visit(x, y, alpha);
      }); continue;
    }
    const stampRadius = radius * maximumScale;
    // Радиус в пикселях: кромка не тоньше пикселя, а карта формы читается с
    // уровня пирамиды по масштабу. Без первого кисть с hardness 1 даёт
    // бинарный край, без второго карта в пятьсот текселей ложится в
    // шестьдесят пикселей одной выборкой — и там, и там штрих идёт ступенями.
    const tip = { ...stamp, pixelRadius: Math.max(1, stampRadius) };
    const extent = sampler.radialEdge !== null ? stampRadius : stampRadius * Math.SQRT2;
    const bounds = [Math.max(clip?.minx ?? -Infinity, Math.floor(stamp.x - extent - 1)),
      Math.min(clip?.maxx ?? Infinity, Math.ceil(stamp.x + extent + 1)),
      Math.max(clip?.miny ?? -Infinity, Math.floor(stamp.y - extent - 1)),
      Math.min(clip?.maxy ?? Infinity, Math.ceil(stamp.y + extent + 1))] as const;
    if (bounds[1] < bounds[0] || bounds[3] < bounds[2]) continue;
    if (sampler.radialEdge !== null && !sampler.textured &&
        stamp.scaleX === 1 && stamp.scaleY === 1) {
      visitRadialDab({ ...sample, x: stamp.x, y: stamp.y }, radius, bounds,
        sampler.radialEdge, baseOpacity, visit);
      continue;
    }
    const sampleTip = sampler.prepareTip(tip);
    const sampleTexture = sampler.prepareTexture({ centerX: stamp.x, centerY: stamp.y,
      offsetX: stamp.grainOffsetX, offsetY: stamp.grainOffsetY,
      depthScale: stamp.grainDepthScale });
    for (let y = bounds[2]; y <= bounds[3]; y += 1) {
      const normalizedY = (y + 0.5 - stamp.y) / radius;
      for (let x = bounds[0]; x <= bounds[1]; x += 1) {
        const normalizedX = (x + 0.5 - stamp.x) / radius;
        const coverage = sampleTip(normalizedX, normalizedY);
        if (coverage <= 0) continue;
        const texture = sampler.textured ? sampleTexture(x, y) : 1;
        const opacity = baseOpacity * coverage * texture;
        if (opacity > 0) visit(x, y, opacity);
      }
    }
  }
}
