import { PIXEL_BATCH_SPARSE_LIMIT } from '../../config/limits.js';

const emptyBounds = () => ({ minx: Infinity, miny: Infinity,
  maxx: -Infinity, maxy: -Infinity });
const copyCell = (cell) => cell ? cell.slice() : null;
const sameCell = (left, right) => {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};
const keyFor = (patch, x, y) => y * patch.width + x;
const makeLayerPatch = (layerIndex, width, height, promote = false) => ({
  layerIndex, width, height, promote, cells: new Map(), bounds: emptyBounds(),
});

export const createPixelPatch = (layerIndex, width, height) => ({
  kind: 'pixel-patch', ...makeLayerPatch(layerIndex, width, height),
});

export function createPixelBatch(indices, width, height) {
  const unique = [...new Set(indices)];
  return { kind: 'pixel-batch', width, height,
    patches: unique.map((index) => makeLayerPatch(index, width, height, true)) };
}

export const isPixelEntry = (entry) =>
  entry?.kind === 'pixel-patch' || entry?.kind === 'pixel-batch';
const patchesOf = (entry) => entry.kind === 'pixel-patch'
  ? [entry] : entry.patches;

function promotePatch(patch, grid) {
  // Cell values are immutable/replaced as units; copy row references, then
  // restore the sparse before-values already changed by this transaction.
  const snapshot = grid.map((row) => row.slice());
  for (const [key, before] of patch.cells) {
    const x = key % patch.width, y = Math.floor(key / patch.width);
    snapshot[y][x] = copyCell(before);
  }
  patch.snapshot = snapshot; patch.cells.clear();
}

function recordLayerPixel(patch, x, y, cell, grid, sparseLimit) {
  if (!patch || x < 0 || y < 0 || x >= patch.width || y >= patch.height) return false;
  if (patch.snapshot) return false;
  const key = keyFor(patch, x, y);
  if (patch.cells.has(key)) return false;
  patch.cells.set(key, copyCell(cell));
  const bounds = patch.bounds;
  bounds.minx = Math.min(bounds.minx, x); bounds.maxx = Math.max(bounds.maxx, x);
  bounds.miny = Math.min(bounds.miny, y); bounds.maxy = Math.max(bounds.maxy, y);
  if (patch.promote && grid && patch.cells.size >= sparseLimit) promotePatch(patch, grid);
  return true;
}

export function recordPixel(entry, layerIndex, x, y, cell, grid,
  sparseLimit = PIXEL_BATCH_SPARSE_LIMIT) {
  const patch = entry && patchesOf(entry).find((item) =>
    item.layerIndex === layerIndex);
  return recordLayerPixel(patch, x, y, cell, grid, sparseLimit);
}

function compactPatch(patch, layers) {
  const layer = layers[patch.layerIndex];
  if (!layer?.grid) return null;
  if (patch.snapshot) return patch;
  const compact = makeLayerPatch(patch.layerIndex, patch.width, patch.height,
    patch.promote);
  for (const [key, before] of patch.cells) {
    const x = key % patch.width, y = Math.floor(key / patch.width);
    if (sameCell(before, layer.grid[y]?.[x])) continue;
    recordLayerPixel(compact, x, y, before);
  }
  return compact.cells.size ? compact : null;
}

export function compactPixelEntry(entry, layers) {
  const source = patchesOf(entry);
  if (source.some((patch) => !layers[patch.layerIndex]?.grid)) return null;
  const patches = source.map((patch) => compactPatch(patch, layers)).filter(Boolean);
  if (!patches.length) return null;
  if (entry.kind === 'pixel-patch') return { kind: 'pixel-patch', ...patches[0] };
  return { ...entry, patches };
}

function validEntry(entry, layers, width, height) {
  return entry.width === width && entry.height === height &&
    patchesOf(entry).every((patch) => patch.width === width && patch.height === height &&
      layers[patch.layerIndex]?.grid);
}

export function swapPixelEntry(entry, layers, width, height, onDirty) {
  if (!validEntry(entry, layers, width, height)) return null;
  if (!patchesOf(entry).some((patch) => patch.snapshot || patch.cells.size)) return null;
  const inverses = [];
  for (const patch of patchesOf(entry)) {
    const inverse = makeLayerPatch(patch.layerIndex, width, height, patch.promote);
    const layer = layers[patch.layerIndex];
    if (patch.snapshot) {
      inverse.snapshot = layer.grid; inverse.bounds = { ...patch.bounds };
      layer.grid = patch.snapshot; inverses.push(inverse);
      onDirty(patch.layerIndex); continue;
    }
    for (const [key, before] of patch.cells) {
      const x = key % width, y = Math.floor(key / width);
      inverse.cells.set(key, copyCell(layer.grid[y][x]));
      layer.grid[y][x] = copyCell(before);
    }
    inverse.bounds = { ...patch.bounds }; inverses.push(inverse);
    if (patch.cells.size) onDirty(patch.layerIndex, patch.bounds);
  }
  if (entry.kind === 'pixel-patch') return { kind: 'pixel-patch', ...inverses[0] };
  return { ...entry, patches: inverses };
}
