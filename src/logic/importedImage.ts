type Rgba = [number, number, number, number];

interface ImportedImageState {
  readonly layers: Array<{ name: string; grid: Array<Array<Rgba | undefined>> }>;
  sourceFormat: string | null;
  sourceLocation: string | null;
}

export function applyImportedImage(
  state: ImportedImageState, width: number, height: number,
  data: Uint8ClampedArray, name: string, sourceFormat: string | null,
  sourceLocation: string | null
): void {
  const layer = state.layers[0];
  if (!layer) throw new Error("Imported image document has no editable layer");
  layer.name = name;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4, alpha = data[offset + 3] ?? 0;
    if (!alpha) continue;
    layer.grid[y]![x] = [data[offset]!, data[offset + 1]!, data[offset + 2]!, alpha];
  }
  state.sourceFormat = sourceFormat;
  state.sourceLocation = sourceLocation;
}
