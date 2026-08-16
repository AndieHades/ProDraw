import type { BrushPreset } from "../../contracts/brush";

export function cloneBrushPreset(preset: BrushPreset): BrushPreset {
  const clone = structuredClone(preset) as unknown as Record<string, unknown>;
  for (const key of ["shapeMap", "grainMap", "nativeShapeMap", "nativeGrainMap",
    "compatibility", "warnings"] as const) {
    delete clone[key];
  }
  return clone as unknown as BrushPreset;
}
