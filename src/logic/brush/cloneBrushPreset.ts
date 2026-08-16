import type { BrushPreset } from "../../contracts/brush";

export function cloneBrushPreset(preset: BrushPreset): BrushPreset {
  return structuredClone(preset);
}
