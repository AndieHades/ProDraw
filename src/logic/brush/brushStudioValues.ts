import type { BrushPreset } from "../../contracts/brush";

export type BrushScalarValue = string | number | boolean;
type MutableRecord = Record<string, unknown>;
const anglePaths = new Set(["shape.angle", "grain.rotation"]);

function pathTarget(root: MutableRecord, path: string): [MutableRecord, string] {
  const parts = path.split(".");
  const property = parts.pop();
  if (!property) throw new Error("Brush control path is empty");
  let target = root;
  for (const part of parts) {
    const next = target[part];
    if ((typeof next !== "object" && !Array.isArray(next)) || next === null) {
      throw new Error(`Unknown brush control path: ${path}`);
    }
    target = next as MutableRecord;
  }
  return [target, property];
}

export function readBrushValue(preset: BrushPreset, path: string): BrushScalarValue {
  const [target, property] = pathTarget(
    preset as unknown as MutableRecord, path
  );
  const value = target[property];
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new Error(`Brush control is not scalar: ${path}`);
  }
  return anglePaths.has(path) ? value as number * 180 / Math.PI : value;
}

export function updateBrushValue(
  preset: BrushPreset,
  path: string,
  value: BrushScalarValue
): BrushPreset {
  const next = structuredClone(preset);
  const [target, property] = pathTarget(next as unknown as MutableRecord, path);
  target[property] = anglePaths.has(path) ? Number(value) * Math.PI / 180 : value;
  return next;
}
