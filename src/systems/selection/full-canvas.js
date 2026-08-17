// Fast whole-canvas selection edits: replace the grid and keep one reversible
// raster reference instead of visiting every selected cell for history.
import { S, blank } from '../../core/state.js';
import { snapshotRasterReferences } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { isSelectionMask } from '../../logic/mask-ops.js';
import { DENSE_SELECTION_REFERENCE_RATIO } from '../../config/selection-mask.ts';

const coversCanvas = () => !S.selMask && S.sel && S.sel.x0 === 0 && S.sel.y0 === 0 &&
  S.sel.x1 === S.W - 1 && S.sel.y1 === S.H - 1;
const pixelIndices = (layers) => layers.map((layer) => S.layers.indexOf(layer))
  .filter((index) => index >= 0);
const validPixels = (indices, count) => indices.length === count &&
  indices.every((index) => (!S.layers[index].kind || S.layers[index].kind === 'pixel'));
function densePlan() {
  if (coversCanvas()) return { unselected: null };
  if (!isSelectionMask(S.selMask) || S.selMask.size < S.W * S.H * DENSE_SELECTION_REFERENCE_RATIO) return null;
  return { unselected: S.selMask.inverted() };
}
function replacementGrid(source, color, unselected) {
  const grid = blank(S.W, S.H); if (color) for (const row of grid) row.fill(color);
  if (unselected) for (const [x, y] of unselected.points()) {
    const cell = source[y]?.[x]; grid[y][x] = cell ? cell.slice() : null; }
  return grid;
}

export function fillFullSelection() {
  const index = S.cur, plan = densePlan();
  if (!plan || !validPixels([index], 1) ||
    !snapshotRasterReferences([index])) return false;
  const color = [S.active[0], S.active[1], S.active[2], 255];
  S.layers[index].grid = replacementGrid(S.layers[index].grid, color, plan.unselected);
  markDirty(index); return true;
}

export function clearFullSelection(layers) {
  const plan = densePlan();
  if (!plan) return false;
  const indices = pixelIndices(layers);
  if (!validPixels(indices, layers.length) || !snapshotRasterReferences(indices)) return false;
  for (const index of indices) {
    S.layers[index].grid = replacementGrid(S.layers[index].grid, null, plan.unselected);
    markDirty(index);
  }
  return true;
}
