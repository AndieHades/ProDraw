import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { strokeRandom } from "./strokeRandom.ts";
import { DEFAULT_GRAIN, DEFAULT_SHAPE } from "../../config/brushDefaults.ts";

export interface DabStampPlan {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
  readonly grainOffsetX: number;
  readonly grainOffsetY: number;
  readonly grainDepthScale: number;
}

const clampScale = (value: number): number => Math.max(0.05, value);

export function dabStampPlan(brush: BrushPreset | LoadedBrush,
  sample: StrokeSample, size: number): readonly DabStampPlan[] {
  const dab = sample.dabIndex ?? Math.round(sample.time);
  const countJitter = strokeRandom(brush.id, dab, 20) *
    (brush.shape.countJitter ?? DEFAULT_SHAPE.countJitter);
  const count = Math.max(1, Math.round((brush.shape.count ?? DEFAULT_SHAPE.count) *
    (1 - countJitter)));
  const tilt = Math.min(1, Math.hypot(sample.tiltX, sample.tiltY) / 90);
  const pressureScale = 1 - (brush.shape.pressureRoundness ??
    DEFAULT_SHAPE.pressureRoundness) * (1 - sample.pressure);
  const tiltScale = 1 - (brush.shape.tiltRoundness ?? DEFAULT_SHAPE.tiltRoundness) * tilt;
  return Array.from({ length: count }, (_, index) => {
    const random = (channel: number) => strokeRandom(brush.id, dab * 7 + index, channel);
    const horizontal = (random(23) * 2 - 1) *
      (brush.shape.horizontalJitter ?? DEFAULT_SHAPE.horizontalJitter);
    const vertical = (random(24) * 2 - 1) *
      (brush.shape.verticalJitter ?? DEFAULT_SHAPE.verticalJitter);
    const scatterRotation = (random(21) * 2 - 1) * Math.PI *
      (brush.shape.scatter ?? DEFAULT_SHAPE.scatter);
    return { x: sample.x, y: sample.y,
      rotation: (sample.rotation ?? 0) + ((brush.shape.randomized ?? DEFAULT_SHAPE.randomized)
        ? random(25) * Math.PI * 2 : scatterRotation),
      scaleX: clampScale(pressureScale * (1 + horizontal)),
      scaleY: clampScale(tiltScale * (1 + vertical)),
      flipX: (brush.shape.flipX ?? DEFAULT_SHAPE.flipX) && random(26) >= 0.5,
      flipY: (brush.shape.flipY ?? DEFAULT_SHAPE.flipY) && random(27) >= 0.5,
      grainOffsetX: (brush.grain.offsetJitter ?? DEFAULT_GRAIN.offsetJitter)
        ? (random(28) * 2 - 1) * size : 0,
      grainOffsetY: (brush.grain.offsetJitter ?? DEFAULT_GRAIN.offsetJitter)
        ? (random(29) * 2 - 1) * size : 0,
      grainDepthScale: 1 - random(30) *
        (brush.grain.depthJitter ?? DEFAULT_GRAIN.depthJitter) };
  });
}
