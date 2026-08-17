export interface PaletteReorderResult<Color> {
  readonly insertAt: number;
  readonly palette: readonly Color[];
  readonly selection: readonly number[];
}

export function reorderPalette<Color>(
  palette: readonly Color[], indices: readonly number[], targetIndex: number, after: boolean
): PaletteReorderResult<Color> | null {
  const moving = [...indices].sort((a, b) => a - b);
  if (!moving.length || moving.includes(targetIndex)) return null;
  const movingSet = new Set(moving);
  const movingColors = moving.map((index) => palette[index]).filter(
    (color): color is Color => color !== undefined);
  const rest = palette.filter((_, index) => !movingSet.has(index));
  const raw = targetIndex + (after ? 1 : 0);
  const insertAt = Math.max(0, Math.min(rest.length,
    raw - moving.filter((index) => index < raw).length));
  return { insertAt, palette: [...rest.slice(0, insertAt), ...movingColors,
    ...rest.slice(insertAt)], selection: movingColors.map((_, index) => insertAt + index) };
}
