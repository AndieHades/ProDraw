import type { BrushResponsePoint } from "../../contracts/brush";
import type { BinaryPlistValue } from "../archive/binaryPlist";
import { normalizedResponseCurve } from "../../logic/brush/responseCurve";

const record = (value: BinaryPlistValue | undefined):
value is Record<string, BinaryPlistValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value) &&
  !(value instanceof Uint8Array) && !("uid" in value);

function point(value: BinaryPlistValue): BrushResponsePoint | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^\{\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\}$/);
  if (!match) return null;
  const x = Number(match[1]), y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function archiveResponseCurve(value: BinaryPlistValue | undefined,
  fallback: readonly BrushResponsePoint[] | undefined): readonly BrushResponsePoint[] {
  if (!record(value) || !record(value.points)) return normalizedResponseCurve(fallback);
  const objects = value.points["NS.objects"];
  if (!Array.isArray(objects)) return normalizedResponseCurve(fallback);
  const points = objects.map(point).filter((entry): entry is BrushResponsePoint => !!entry);
  return normalizedResponseCurve(points.length > 0 ? points : fallback);
}
