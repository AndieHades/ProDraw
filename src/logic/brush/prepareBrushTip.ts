import type { BrushShapeSettings, CoverageMap } from "../../contracts/brush.ts";
import type { BrushTipTransform } from "../../contracts/brushSampling.ts";
import { buildCoverageMips, type CoverageMips } from "./coverageMips.ts";
import { sampleCoverage } from "./coverageSampling.ts";

const pyramids = new WeakMap<CoverageMap, CoverageMips>();
const levelsFor = (map: CoverageMap): CoverageMips => {
  let levels = pyramids.get(map);
  if (!levels) { levels = buildCoverageMips(map); pyramids.set(map, levels); }
  return levels;
};

// Compile the transform and mip selection once per stamp, never per pixel.
export function prepareBrushTip(shape: CoverageMap | null,
  settings: BrushShapeSettings, transform: BrushTipTransform): (x: number, y: number) => number {
  const angle = settings.angle + (transform.rotation ?? 0);
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const scaleX = (transform.flipX ? -1 : 1) / Math.max(0.05, transform.scaleX ?? 1);
  const scaleY = (transform.flipY ? -1 : 1) / Math.max(0.05, transform.scaleY ?? 1);
  const roundness = Math.max(0.05, settings.roundness);
  const ax = scaleX * cosine, bx = scaleY * sine;
  const ay = -scaleX * sine / roundness, by = scaleY * cosine / roundness;
  const radius = transform.pixelRadius ?? 0;
  const softness = Math.max(0.001, 1 - settings.hardness, radius > 0 ? 1 / radius : 0);
  const levels = shape ? levelsFor(shape) : null;
  const depth = levels && shape && radius > 0
    ? Math.max(0, Math.min(levels.length - 1, Math.log2(shape.width / (radius * 2)))) : 0;
  const lower = Math.floor(depth), blend = depth - lower;
  const near = levels?.[lower], coarse = levels?.[lower + 1];
  return (x, y) => {
    const tx = x * ax + y * bx, ty = x * ay + y * by;
    if (Math.abs(tx) > 1 || Math.abs(ty) > 1) return 0;
    if (near) {
      const u = (tx + 1) / 2, v = (ty + 1) / 2;
      const value = sampleCoverage(near, u, v, settings.filtering);
      return coarse && blend > 0 ? value +
        (sampleCoverage(coarse, u, v, settings.filtering) - value) * blend : value;
    }
    const distance = Math.hypot(tx, ty);
    return distance >= 1 ? 0 : Math.min(1, Math.max(0, (1 - distance) / softness));
  };
}
