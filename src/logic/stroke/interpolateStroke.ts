import type { StrokeSample } from "../../contracts/stroke";

function interpolate(left: StrokeSample, right: StrokeSample, amount: number): StrokeSample {
  const mix = (start: number, end: number) => start + (end - start) * amount;
  return {
    x: mix(left.x, right.x),
    y: mix(left.y, right.y),
    pressure: mix(left.pressure, right.pressure),
    tiltX: mix(left.tiltX, right.tiltX),
    tiltY: mix(left.tiltY, right.tiltY),
    time: mix(left.time, right.time),
    ...(right.pointerType ?? left.pointerType
      ? { pointerType: right.pointerType ?? left.pointerType } : {})
  };
}

export function interpolateStrokeSegment(
  left: StrokeSample,
  right: StrokeSample,
  spacing: number
): readonly StrokeSample[] {
  const distance = Math.hypot(right.x - left.x, right.y - left.y);
  if (distance === 0) return [right];
  const steps = Math.max(1, Math.ceil(distance / Math.max(0.25, spacing)));
  return Array.from({ length: steps }, (_, index) =>
    interpolate(left, right, (index + 1) / steps));
}

export function normalizePointerPressure(pressure: number, pointerType: string): number {
  if (pointerType === "mouse") return 1;
  return Math.max(0.01, Math.min(1, pressure || 0.01));
}
