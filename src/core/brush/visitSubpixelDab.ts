import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import type { DabStampPlan } from "../../logic/brush/dabStampPlan";
import type { BrushCoverageSampler } from "../../logic/brush/brushCoverage";

type Visitor = (x: number, y: number, opacity: number) => void;

function integratedTip(sampler: BrushCoverageSampler,
  stamp: DabStampPlan): number {
  const grid = rasterConfig.subpixelDab.integrationGrid;
  let coverage = 0;
  for (let y = 0; y < grid; y += 1) for (let x = 0; x < grid; x += 1) {
    coverage += sampler.tip((x + 0.5) / grid * 2 - 1,
      (y + 0.5) / grid * 2 - 1, stamp);
  }
  return coverage / (grid * grid);
}

export function visitSubpixelDab(sampler: BrushCoverageSampler,
  stamp: DabStampPlan, diameter: number, opacity: number, visit: Visitor): void {
  const ink = integratedTip(sampler, stamp) * diameter * diameter * opacity;
  if (ink <= 0) return;
  const left = Math.floor(stamp.x - 0.5), top = Math.floor(stamp.y - 0.5);
  for (let y = top; y <= top + 1; y += 1) for (let x = left; x <= left + 1; x += 1) {
    const weightX = 1 - Math.abs(stamp.x - (x + 0.5));
    const weightY = 1 - Math.abs(stamp.y - (y + 0.5));
    const texture = sampler.textured ? sampler.texture(x, y, {
      centerX: stamp.x, centerY: stamp.y, offsetX: stamp.grainOffsetX,
      offsetY: stamp.grainOffsetY, depthScale: stamp.grainDepthScale }) : 1;
    const pixelOpacity = Math.min(1, ink * weightX * weightY * texture);
    if (pixelOpacity > 0) visit(x, y, pixelOpacity);
  }
}
