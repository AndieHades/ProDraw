// Bounded pixel-history paths for ordinary raster layer bulk commands.
// Non-raster layers and layers with off-canvas `ext` data stay on their
// reference snapshot path so text/off-canvas semantics are preserved.
import { S, blank } from '../../core/state.js';
import { beginPixelBatch, commitPixelPatch,
  recordPixelBefore, snapshotRasterReferences } from '../../core/history.js';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';

const fullBounds = () => ({ minx: 0, miny: 0,
  maxx: S.W - 1, maxy: S.H - 1 });
const isOrdinaryRaster = (layer) => !!layer &&
  (!layer.kind || layer.kind === 'pixel') && !(layer.ext?.size);
const targetIndices = (layers) => [...new Set(layers.map((layer) =>
  S.layers.indexOf(layer)))].filter((index) => index >= 0);
const opaque = (cell) => !!cell && (cell[3] ?? 255) > 0;

function beginTargets(layers) {
  const indices = targetIndices(layers);
  if (!indices.length || indices.some((index) =>
    !isOrdinaryRaster(S.layers[index]))) return null;
  return beginPixelBatch(indices) ? indices : null;
}

function replaceWithUniformGrid(indices, color) {
  if (!snapshotRasterReferences(indices)) return false;
  const fill = [color[0], color[1], color[2], 255];
  for (const index of indices) { const grid = blank(S.W, S.H);
    for (const row of grid) row.fill(fill);
    S.layers[index].grid = grid; markDirty(index); }
  return true;
}

function hasOpaque(grid, bounds) {
  if (!bounds) return false;
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      if (opaque(grid[y][x])) return true;
    }
  }
  return false;
}

function replaceOpaque(index, color, bounds) {
  const grid = S.layers[index].grid;
  const colors = new Map(); let recording = true, changed = null;
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      const cell = grid[y][x]; if (!opaque(cell)) continue;
      if (recording) recording = recordPixelBefore(index, x, y, cell);
      const alpha = cell[3] ?? 255;
      if (!colors.has(alpha)) colors.set(alpha, [color[0], color[1], color[2], alpha]);
      grid[y][x] = colors.get(alpha);
      changed = changed ? { minx: Math.min(changed.minx, x),
        miny: Math.min(changed.miny, y), maxx: Math.max(changed.maxx, x),
        maxy: Math.max(changed.maxy, y) }
        : { minx: x, miny: y, maxx: x, maxy: y };
    }
  }
  if (changed) markDirty(index, changed);
}

function fillWhole(index, color) {
  const grid = S.layers[index].grid, fill = [color[0], color[1], color[2], 255];
  let recording = true;
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
    if (recording) recording = recordPixelBefore(index, x, y, grid[y][x]);
    grid[y][x] = fill;
  }
  markDirty(index, fullBounds());
}

export function replaceOrFillRasterTargets(layers, color) {
  const candidates = targetIndices(layers);
  if (!candidates.length || candidates.some((index) =>
    !isOrdinaryRaster(S.layers[index]))) return null;
  const states = candidates.map((index) => ({ index,
    bounds: layerContentBounds(index), grid: S.layers[index].grid }));
  if (states.every(({ bounds, grid }) => !hasOpaque(grid, bounds)))
    return replaceWithUniformGrid(candidates, color);
  const indices = beginTargets(layers); if (!indices) return null;
  for (const index of indices) {
    const bounds = layerContentBounds(index), grid = S.layers[index].grid;
    if (hasOpaque(grid, bounds)) replaceOpaque(index, color, bounds);
    else fillWhole(index, color);
  }
  commitPixelPatch(); return true;
}

export function fillRasterTargets(layers, color) {
  const indices = targetIndices(layers);
  if (!indices.length || indices.some((index) =>
    !isOrdinaryRaster(S.layers[index]))) return null;
  return replaceWithUniformGrid(indices, color);
}

export function clearRasterTargets(layers) {
  const indices = beginTargets(layers); if (!indices) return null;
  let changed = false;
  for (const index of indices) {
    const grid = S.layers[index].grid, bounds = layerContentBounds(index);
    if (!hasOpaque(grid, bounds)) continue;
    let recording = true;
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        const cell = grid[y][x]; if (!cell) continue;
        if (recording) recording = recordPixelBefore(index, x, y, cell);
        grid[y][x] = null; changed = true;
      }
    }
    markDirty(index, bounds);
  }
  commitPixelPatch(); return changed;
}
