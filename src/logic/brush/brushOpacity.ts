import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";
import { DEFAULT_PROPERTIES, DEFAULT_RENDERING } from "../../config/brushDefaults.ts";
import { responseCurve } from "./responseCurve.ts";
import { strokeRandom } from "./strokeRandom.ts";

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
  const curved = responseCurve(sample.pressure, brush.dynamics.pressureOpacityCurve);
  const pressure = 1 - brush.dynamics.opacityByPressure +
    brush.dynamics.opacityByPressure * curved;
  const opacityRange = (brush.properties.minimumOpacity ??
    DEFAULT_PROPERTIES.minimumOpacity) + ((brush.properties.maximumOpacity ??
    DEFAULT_PROPERTIES.maximumOpacity) - (brush.properties.minimumOpacity ??
    DEFAULT_PROPERTIES.minimumOpacity)) * pressure;
  const speed = Math.max(0, sample.speed ?? 0);
  const speedResponse = speed / (speed + 1);
  const speedFactor = 1 + (brush.dynamics.speedOpacity ?? 0) * (speedResponse - 0.5);
  const tilt = Math.min(1, Math.hypot(sample.tiltX, sample.tiltY) / 90);
  const tiltFactor = 1 + (brush.dynamics.tiltOpacity ?? 0) * (tilt - 0.5);
  const jitter = 1 - strokeRandom(brush.id, sample.dabIndex ?? Math.round(sample.time), 40) *
    (brush.dynamics.opacityJitter ?? 0);
  const mode = brush.rendering.mode ?? DEFAULT_RENDERING.mode;
  const raw = requestedOpacity * (brush.rendering.opacity ?? DEFAULT_RENDERING.opacity) *
    (brush.rendering.flow ?? DEFAULT_RENDERING.flow) * opacityRange *
    speedFactor * tiltFactor * jitter *
    (sample.opacityScale ?? 1) * MODE_FACTOR[mode];
  if (raw <= 0) return 0;
  return Math.min(1, raw);
}
