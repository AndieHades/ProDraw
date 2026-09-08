import type { BrushPreset } from "../../contracts/brush.ts";
import type { StrokeSample } from "../../contracts/stroke.ts";
import { responseCurve } from "./responseCurve.ts";

export function pressureBrushSize(brush: BrushPreset, size: number,
  sample: Pick<StrokeSample, "pressure" | "tiltX" | "tiltY" | "sizeScale">): number {
  const curved = responseCurve(sample.pressure, brush.dynamics.pressureSizeCurve);
  const response = 1 - brush.dynamics.sizeByPressure + brush.dynamics.sizeByPressure * curved;
  const tilt = brush.stylus.tiltEnabled
    ? Math.min(1, Math.hypot(sample.tiltX, sample.tiltY) / 90) : 0;
  return Math.max(0.05, size * response * (1 + brush.dynamics.tiltToSize * tilt) *
    (sample.sizeScale ?? 1));
}
