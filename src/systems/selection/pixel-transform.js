import { S } from '../../core/state.js';
import { snapshotRasterReferences } from '../../core/history.js';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { maskHas } from '../../core/selection.js';
import { setGridBounds } from '../../logic/raster.js';
import { SELECTION_BOUNDS_FALLBACK_PIXELS } from '../../config/selection-mask.js';
import {
  mapSelectionMask,
  selectionMaskFromState,
  selectionStateFromMask,
} from '../../logic/mask-ops.js';

function mergeBounds(left, right) {
  if (!left) return right ? { ...right } : null;
  if (!right) return { ...left };
  return {
    minx: Math.min(left.minx, right.minx),
    miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx),
    maxy: Math.max(left.maxy, right.maxy),
  };
}

function selectedItems(layer, selection, mask) {
  let content = layerContentBounds(S.cur);
  const selectionArea = (selection.x1 - selection.x0 + 1) *
    (selection.y1 - selection.y0 + 1);
  if (!content && selectionArea <= SELECTION_BOUNDS_FALLBACK_PIXELS) {
    content = { minx: selection.x0, miny: selection.y0,
      maxx: selection.x1, maxy: selection.y1 };
  }
  if (!content) return [];
  const bounds = {
    minx: Math.max(selection.x0, content.minx),
    miny: Math.max(selection.y0, content.miny),
    maxx: Math.min(selection.x1, content.maxx),
    maxy: Math.min(selection.y1, content.maxy),
  };
  if (bounds.minx > bounds.maxx || bounds.miny > bounds.maxy) return [];
  const output = [];
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      const color = layer.grid[y][x];
      if (color && maskHas(mask, x, y)) output.push({ x, y, color: color.slice() });
    }
  }
  return output;
}

export function transformPixelSelection(layer, mapPoint) {
  const selection = { ...S.sel };
  const mask = selectionMaskFromState(selection, S.selMask, S.W, S.H);
  const sourceBounds = layerContentBounds(S.cur);
  const items = selectedItems(layer, selection, mask);
  const mapped = mapSelectionMask(mask, selection,
    (x, y) => mapPoint(x, y, selection), S.W, S.H);
  const state = selectionStateFromMask(mapped);
  if (!items.length) {
    S.sel = state?.sel ?? null;
    S.selMask = state?.mask ?? null;
    return true;
  }
  if (!snapshotRasterReferences([S.cur])) return false;
  const sourceGrid = layer.grid;
  const targetGrid = sourceGrid.slice();
  const clonedRows = new Set();
  const rowForWrite = (y) => {
    if (!clonedRows.has(y)) {
      targetGrid[y] = sourceGrid[y].slice();
      clonedRows.add(y);
    }
    return targetGrid[y];
  };
  let dirty = null;
  for (const item of items) {
    rowForWrite(item.y)[item.x] = null;
    dirty = mergeBounds(dirty, { minx: item.x, miny: item.y, maxx: item.x, maxy: item.y });
  }
  const targetExt = new Map(layer.ext);
  for (const item of items) {
    const [x, y] = mapPoint(item.x, item.y, selection);
    if (x >= 0 && y >= 0 && x < S.W && y < S.H) {
      rowForWrite(y)[x] = item.color;
      dirty = mergeBounds(dirty, { minx: x, miny: y, maxx: x, maxy: y });
    } else targetExt.set(x + ',' + y, item.color);
  }
  layer.grid = targetGrid;
  layer.ext = targetExt;
  const knownBounds = mergeBounds(sourceBounds, dirty);
  setGridBounds(targetGrid, knownBounds, false);
  if (dirty) markDirty(S.cur, dirty);
  S.sel = state?.sel ?? null;
  S.selMask = state?.mask ?? null;
  return true;
}
