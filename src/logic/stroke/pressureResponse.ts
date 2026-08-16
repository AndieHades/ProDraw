import type { BrushStylusSettings } from "../../contracts/brush";
import type { StrokeSample } from "../../contracts/stroke";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function pressureCurveValue(
  pressure: number,
  curve: readonly [number, number, number, number]
): number {
  const amount = clamp01(pressure);
  const inverse = 1 - amount;
  return clamp01(inverse ** 3 * curve[0] + 3 * inverse ** 2 * amount * curve[1] +
    3 * inverse * amount ** 2 * curve[2] + amount ** 3 * curve[3]);
}

export function calibratedPressure(
  pressure: number,
  settings: BrushStylusSettings
): number {
  const minimum = clamp01(settings.minimumPressure);
  const normalized = clamp01((clamp01(pressure) - minimum) / Math.max(0.001, 1 - minimum));
  return pressureCurveValue(normalized, settings.pressureCurve);
}

export function applyStylusResponse(
  sample: StrokeSample,
  settings: BrushStylusSettings
): StrokeSample {
  return { ...sample, pressure: calibratedPressure(sample.pressure, settings),
    tiltX: settings.tiltEnabled ? sample.tiltX : 0,
    tiltY: settings.tiltEnabled ? sample.tiltY : 0 };
}
