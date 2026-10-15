import { packedImageGrid } from "./raster/packedImageRecord.ts";

interface ImportedImageState {
  readonly layers: Array<{ name: string; grid: unknown }>;
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
  layer.grid = packedImageGrid(width, height, data);
  state.sourceFormat = sourceFormat;
  state.sourceLocation = sourceLocation;
}
