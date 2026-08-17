import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { DEFAULT_PROPERTIES, DEFAULT_RENDERING } from "../../config/brushDefaults.ts";

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
  const mode = brush.rendering.mode ?? DEFAULT_RENDERING.mode;
  const raw = requestedOpacity * (brush.rendering.opacity ?? DEFAULT_RENDERING.opacity) *
    (brush.rendering.flow ?? DEFAULT_RENDERING.flow) * pressure *
    (sample.opacityScale ?? 1) * MODE_FACTOR[mode];
  if (raw <= 0) return 0;
  return Math.max(brush.properties.minimumOpacity ?? DEFAULT_PROPERTIES.minimumOpacity,
    Math.min(brush.properties.maximumOpacity ?? DEFAULT_PROPERTIES.maximumOpacity, raw));
}
