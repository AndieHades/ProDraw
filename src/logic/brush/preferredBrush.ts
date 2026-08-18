import type { BrushPreset } from "../../contracts/brush";

export function preferredBrush(brushes: readonly BrushPreset[]): BrushPreset | undefined {
  return brushes.find(({ id }) => id === "lineart") ?? brushes[0];
}
