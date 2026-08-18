import type { BrushResponsePoint } from "../../contracts/brush";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function normalizedResponseCurve(
  points: readonly BrushResponsePoint[] | undefined
): readonly BrushResponsePoint[] {
  const byX = new Map<number, number>();
  for (const point of points ?? []) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    byX.set(clamp01(point.x), clamp01(point.y));
  }
  byX.set(0, byX.get(0) ?? 0); byX.set(1, byX.get(1) ?? 1);
  let floor = 0;
  return [...byX].sort(([left], [right]) => left - right).map(([x, y]) => {
    floor = Math.max(floor, y); return { x, y: floor };
  });
}

export function responseCurve(value: number,
  points: readonly BrushResponsePoint[] | undefined): number {
  const curve = normalizedResponseCurve(points);
  const x = clamp01(value);
  for (let index = 1; index < curve.length; index += 1) {
    const right = curve[index]!, left = curve[index - 1]!;
    if (x > right.x) continue;
    const width = right.x - left.x;
    return width <= 0 ? right.y : left.y + (right.y - left.y) * (x - left.x) / width;
  }
  return curve.at(-1)?.y ?? x;
}
