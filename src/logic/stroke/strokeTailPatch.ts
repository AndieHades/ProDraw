import type { BrushPreset } from "../../contracts/brush.ts";
import type { StrokeBounds, StrokeSample } from "../../contracts/stroke.ts";
import { pressureBrushSize } from "../brush/pressureBrushSize.ts";

export interface StrokeTailPatch {
  readonly bounds: StrokeBounds;
  readonly samples: readonly StrokeSample[];
}

const intersects = (a: StrokeBounds, b: StrokeBounds): boolean =>
  a.maxx >= b.minx && a.minx <= b.maxx && a.maxy >= b.miny && a.miny <= b.maxy;

export function strokeTailPatch(brush: BrushPreset, size: number,
  original: readonly StrokeSample[], completed: readonly StrokeSample[]): StrokeTailPatch | null {
  let bounds: StrokeBounds | null = null;
  const extent = (sample: StrokeSample): StrokeBounds => {
    const radius = pressureBrushSize(brush, size, sample) * Math.SQRT2 / 2 *
      (1 + Math.max(brush.shape.horizontalJitter, brush.shape.verticalJitter)) + 2;
    return { minx: Math.floor(sample.x - radius), miny: Math.floor(sample.y - radius),
      maxx: Math.ceil(sample.x + radius), maxy: Math.ceil(sample.y + radius) };
  };
  for (let index = original.length - 1; index >= 0; index--) {
    const before = original[index], after = completed[index];
    if (!before || !after || (before.sizeScale === after.sizeScale &&
      before.opacityScale === after.opacityScale)) continue;
    const area = extent(before);
    bounds = bounds ? { minx: Math.min(bounds.minx, area.minx), miny: Math.min(bounds.miny, area.miny),
      maxx: Math.max(bounds.maxx, area.maxx), maxy: Math.max(bounds.maxy, area.maxy) } : area;
  }
  if (!bounds) return null;
  const region = bounds;
  return { bounds, samples: completed.filter(sample => intersects(extent(sample), region)) };
}
