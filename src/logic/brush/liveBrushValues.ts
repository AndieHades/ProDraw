import type { LoadedBrush } from "../../contracts/brush.ts";
import type { BrushScalarValue } from "./brushStudioValues.ts";
import { LIVE_BRUSH_CONTROLS } from "../../config/liveBrushControls.ts";

export type BrushValues = Readonly<Record<string, BrushScalarValue>>;

export function validatedBrushValues(value: unknown): BrushValues {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const result: Record<string, BrushScalarValue> = {};
  for (const definition of LIVE_BRUSH_CONTROLS) {
    const entry = record[definition.path];
    if (definition.kind === "range" && typeof entry === "number" && Number.isFinite(entry)) {
      const low = definition.minimum ?? 0, high = definition.maximum ?? 1;
      const step = definition.step ?? 0.01;
      result[definition.path] = Math.max(low, Math.min(high, Math.round(entry / step) * step));
    } else if (definition.kind === "checkbox" && typeof entry === "boolean") {
      result[definition.path] = entry;
    } else if (definition.kind === "select" && typeof entry === "string" &&
      definition.options?.includes(entry)) result[definition.path] = entry;
  }
  return result;
}

// Copy only changed settings branches. Decoded bitmap arrays stay shared and immutable.
export function applyLiveBrushValues(source: LoadedBrush, values: BrushValues): LoadedBrush {
  const result = { ...source } as unknown as Record<string, unknown>;
  for (const [path, raw] of Object.entries(values)) {
    const parts = path.split("."); let target = result;
    for (const part of parts.slice(0, -1)) {
      const current = target[part];
      target[part] = Array.isArray(current) ? [...current] : { ...current as object };
      target = target[part] as Record<string, unknown>;
    }
    target[parts.at(-1)!] = path === "shape.angle" || path === "grain.rotation"
      ? Number(raw) * Math.PI / 180 : raw;
  }
  return result as unknown as LoadedBrush;
}
