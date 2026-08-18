import type { BrushPreset, LoadedBrush } from "../../contracts/brush";

export interface SavedBrushControls {
  readonly size: number;
  readonly opacity: number;
}

export function savedBrushControls(
  brush: BrushPreset | LoadedBrush,
  maximumSliderSize: number
): SavedBrushControls {
  const minimum = Math.max(1, brush.properties.minimumSize);
  const maximum = Math.max(minimum, Math.min(maximumSliderSize,
    brush.properties.maximumSize));
  const savedSize = Math.max(0, Math.min(1, brush.savedSize ?? 0));
  return {
    size: Math.max(1, Math.min(maximumSliderSize,
      minimum + (maximum - minimum) * savedSize)),
    opacity: Math.max(0, Math.min(1, brush.savedOpacity ?? 1))
  };
}
