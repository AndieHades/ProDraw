import { PIXEL_BATCH_SPARSE_LIMIT } from "../../config/limits.ts";
import type { LayerPixelPatch, LegacyPixelGrid, PixelBounds, PixelCell,
  PixelDirtyCallback, PixelEntry, PixelHistoryLayer, SinglePixelPatch } from
  "./pixelPatchTypes.ts";

const emptyBounds = (): PixelBounds => ({ minx: Infinity, miny: Infinity,
  maxx: -Infinity, maxy: -Infinity });
const copyCell = (cell: PixelCell): PixelCell => cell ? cell.slice() : null;
const sameCell = (left: PixelCell, right: PixelCell): boolean => {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};
const keyFor = (patch: LayerPixelPatch, x: number, y: number): number =>
  y * patch.width + x;
const makeLayerPatch = (layerIndex: number, width: number, height: number,
  promote = false): LayerPixelPatch => ({ layerIndex, width, height, promote,
  cells: new Map(), bounds: emptyBounds() });

export const createPixelPatch = (layerIndex: number, width: number,
  height: number): SinglePixelPatch => ({ kind: "pixel-patch",
  ...makeLayerPatch(layerIndex, width, height) });

export function createPixelBatch(indices: Iterable<number>, width: number,
  height: number): PixelEntry {
  const unique = [...new Set(indices)];
  return { kind: "pixel-batch", width, height,
    patches: unique.map((index) => makeLayerPatch(index, width, height, true)) };
}

export const isPixelEntry = (entry: unknown): entry is PixelEntry => {
  const kind = (entry as { kind?: unknown } | null)?.kind;
  return kind === "pixel-patch" || kind === "pixel-batch";
};
const patchesOf = (entry: PixelEntry): LayerPixelPatch[] =>
  entry.kind === "pixel-patch" ? [entry] : entry.patches;

function promotePatch(patch: LayerPixelPatch, grid: LegacyPixelGrid): void {
  const snapshot = grid.map((row) => row.slice());
  for (const [key, before] of patch.cells) {
    const x = key % patch.width, y = Math.floor(key / patch.width);
    const row = snapshot[y]; if (row) row[x] = copyCell(before);
  }
  patch.snapshot = snapshot; patch.cells.clear();
}

function recordLayerPixel(patch: LayerPixelPatch | undefined, x: number, y: number,
  cell: PixelCell, grid?: LegacyPixelGrid, sparseLimit = PIXEL_BATCH_SPARSE_LIMIT): boolean {
  if (!patch || x < 0 || y < 0 || x >= patch.width || y >= patch.height ||
    patch.snapshot) return false;
  const key = keyFor(patch, x, y); if (patch.cells.has(key)) return false;
  patch.cells.set(key, copyCell(cell));
  patch.bounds.minx = Math.min(patch.bounds.minx, x);
  patch.bounds.maxx = Math.max(patch.bounds.maxx, x);
  patch.bounds.miny = Math.min(patch.bounds.miny, y);
  patch.bounds.maxy = Math.max(patch.bounds.maxy, y);
  if (patch.promote && grid && patch.cells.size >= sparseLimit) promotePatch(patch, grid);
  return true;
}

export function recordPixel(entry: PixelEntry | null, layerIndex: number,
  x: number, y: number, cell: PixelCell, grid?: LegacyPixelGrid,
  sparseLimit = PIXEL_BATCH_SPARSE_LIMIT): boolean {
  const patch = entry && patchesOf(entry).find((item) => item.layerIndex === layerIndex);
  return recordLayerPixel(patch ?? undefined, x, y, cell, grid, sparseLimit);
}

function compactPatch(patch: LayerPixelPatch,
  layers: readonly PixelHistoryLayer[]): LayerPixelPatch | null {
  const layer = layers[patch.layerIndex]; if (!layer?.grid) return null;
  if (patch.snapshot) return patch;
  const compact = makeLayerPatch(patch.layerIndex, patch.width, patch.height,
    patch.promote);
  for (const [key, before] of patch.cells) {
    const x = key % patch.width, y = Math.floor(key / patch.width);
    if (sameCell(before, layer.grid[y]?.[x] ?? null)) continue;
    recordLayerPixel(compact, x, y, before);
  }
  return compact.cells.size ? compact : null;
}

export function compactPixelEntry(entry: PixelEntry,
  layers: readonly PixelHistoryLayer[]): PixelEntry | null {
  const source = patchesOf(entry);
  if (source.some((patch) => !layers[patch.layerIndex]?.grid)) return null;
  const patches = source.map((patch) => compactPatch(patch, layers))
    .filter((patch): patch is LayerPixelPatch => Boolean(patch));
  if (!patches.length) return null;
  if (entry.kind === "pixel-patch") { const patch = patches[0];
    return patch ? { kind: "pixel-patch", ...patch } : null; }
  return { ...entry, patches };
}

function validEntry(entry: PixelEntry, layers: readonly PixelHistoryLayer[],
  width: number, height: number): boolean {
  return entry.width === width && entry.height === height && patchesOf(entry)
    .every((patch) => patch.width === width && patch.height === height &&
      Boolean(layers[patch.layerIndex]?.grid));
}

export function swapPixelEntry(entry: PixelEntry,
  layers: readonly PixelHistoryLayer[], width: number, height: number,
  onDirty: PixelDirtyCallback): PixelEntry | null {
  if (!validEntry(entry, layers, width, height) || !patchesOf(entry)
    .some((patch) => patch.snapshot || patch.cells.size)) return null;
  const inverses: LayerPixelPatch[] = [];
  for (const patch of patchesOf(entry)) {
    const inverse = makeLayerPatch(patch.layerIndex, width, height, patch.promote);
    const layer = layers[patch.layerIndex]; if (!layer) return null;
    if (patch.snapshot) { inverse.snapshot = layer.grid; inverse.bounds = { ...patch.bounds };
      layer.grid = patch.snapshot; inverses.push(inverse); onDirty(patch.layerIndex); continue; }
    for (const [key, before] of patch.cells) {
      const x = key % width, y = Math.floor(key / width), row = layer.grid[y];
      if (!row) continue; inverse.cells.set(key, copyCell(row[x] ?? null));
      row[x] = copyCell(before);
    }
    inverse.bounds = { ...patch.bounds }; inverses.push(inverse);
    if (patch.cells.size) onDirty(patch.layerIndex, patch.bounds);
  }
  if (entry.kind === "pixel-patch") { const inverse = inverses[0];
    return inverse ? { kind: "pixel-patch", ...inverse } : null; }
  return { ...entry, patches: inverses };
}
