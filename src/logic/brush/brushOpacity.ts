import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";

const MODE_FACTOR = {
  "light-glaze": 0.45,
  "uniform-glaze": 0.65,
  "intense-glaze": 0.82,
  "heavy-glaze": 1.12,
  "uniform-blending": 0.88,
  "intense-blending": 1
} as const;

export function brushDabOpacity(brush: BrushPreset | LoadedBrush,
  sample: StrokeSample, requestedOpacity: number): number {
  const pressure = 1 - brush.dynamics.opacityByPressure +
    brush.dynamics.opacityByPressure * sample.pressure;
  const raw = requestedOpacity * brush.rendering.opacity * brush.rendering.flow *
    pressure * (sample.opacityScale ?? 1) * MODE_FACTOR[brush.rendering.mode];
  if (raw <= 0) return 0;
  return Math.max(brush.properties.minimumOpacity,
    Math.min(brush.properties.maximumOpacity, raw));
}
