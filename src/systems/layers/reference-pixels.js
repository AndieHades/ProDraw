import { S, blank } from '../../core/state.js';
import { snapshotRasterReferences } from '../../core/history.js';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { rasterizeTextTargets } from '../../core/text-rasterize.js';
import { isTextLayer } from '../../logic/text-model.js';
import { forkRasterRows } from '../../logic/raster-row-fork.js';
import { setGridBounds } from '../../logic/raster.js';

const opaque = (cell) => !!cell && (cell[3] ?? 255) > 0;
const fullBounds = () => ({ minx: 0, miny: 0,
  maxx: S.W - 1, maxy: S.H - 1 });
const supported = (layer) => isTextLayer(layer) ||
  !!layer && (!layer.kind || layer.kind === 'pixel');

function beginReference(layers, { fork = false, rasterize = false } = {}) {
  const unique = [...new Set(layers)], indices = unique.map((layer) =>
    S.layers.indexOf(layer));
  if (!unique.length || indices.some((index) => index < 0) ||
    unique.some((layer) => !supported(layer)) ||
    !snapshotRasterReferences(indices)) return null;
  const text = unique.filter(isTextLayer), textSet = new Set(text);
  if (rasterize) rasterizeTextTargets(text);
  const items = indices.map((index) => { const layer = S.layers[index];
    const bounds = layerContentBounds(index);
    let rowFork = null;
    if (fork && !textSet.has(layer)) {
      rowFork = forkRasterRows(layer.grid, bounds);
      layer.grid = rowFork.grid;
    }
    layer.ext = new Map(layer.ext);
    return { index, layer, rowFork, bounds };
  });
  return { items, textSet };
}

function contentBounds(item) {
  const bounds = item.bounds;
  if (bounds) for (let y = bounds.miny; y <= bounds.maxy; y++) {
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      if (opaque(item.layer.grid[y][x])) return bounds;
    }
  }
  return [...item.layer.ext.values()].some(opaque) ? bounds : null;
}

function replaceUniform(item, color) {
  const fill = [color[0], color[1], color[2], 255];
  const grid = blank(S.W, S.H); for (const row of grid) row.fill(fill);
  item.layer.grid = grid; item.layer.ext = new Map();
  markDirty(item.index); setGridBounds(grid, fullBounds(), true);
}

function replaceOpaque(item, color, bounds) {
  if (bounds) for (let y = bounds.miny; y <= bounds.maxy; y++) {
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      const cell = item.layer.grid[y][x]; if (!opaque(cell)) continue;
      const row = item.rowFork?.writableRow(y) || item.layer.grid[y];
      row[x] = [color[0], color[1], color[2], cell[3] ?? 255];
    }
  }
  for (const [key, cell] of item.layer.ext) if (opaque(cell)) {
    item.layer.ext.set(key, [color[0], color[1], color[2], cell[3] ?? 255]);
  }
  if (bounds) markDirty(item.index, bounds);
  else { markBounded(item, bounds); setGridBounds(item.layer.grid, null, true); }
}

function makePixel(layer) {
  if (!isTextLayer(layer)) return;
  layer.kind = 'pixel'; delete layer.text;
}

const emptyDamage = () => ({ minx: 0, miny: 0, maxx: -1, maxy: -1 });
const markBounded = (item, bounds = item.bounds) =>
  markDirty(item.index, bounds || emptyDamage());

export function replaceOrFillReferenceTargets(layers, color) {
  const plan = beginReference(layers, { fork: true, rasterize: true });
  if (!plan) return null;
  for (const item of plan.items) { const bounds = contentBounds(item);
    if (bounds || item.layer.ext.size) replaceOpaque(item, color, bounds);
    else replaceUniform(item, color); }
  return true;
}

export function fillReferenceTargets(layers, color) {
  const plan = beginReference(layers); if (!plan) return null;
  for (const item of plan.items) { makePixel(item.layer);
    replaceUniform(item, color); }
  return true;
}

export function clearReferenceTargets(layers) {
  const plan = beginReference(layers); if (!plan) return null;
  for (const item of plan.items) { makePixel(item.layer);
    const grid = blank(S.W, S.H); item.layer.grid = grid;
    item.layer.ext = new Map(); markBounded(item);
    setGridBounds(grid, null, true); }
  return true;
}
