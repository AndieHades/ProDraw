// Монохром: оттенки серого по яркости (Rec. 601), альфа сохраняется.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { beginPixelBatch, commitPixelPatch, recordPixelBefore,
  snapshot, snapshotRasterReferences } from '../core/history.js';
import { dirtyAll, layerContentBounds, markDirty } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';
import { rasterizeTextTargets } from '../core/text-rasterize.js';
import { isTextLayer } from '../logic/text-model.js';
import { forkRasterRows } from '../logic/raster-row-fork.js';

const lum = (c) => Math.round(c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114);

export function toMono(L) { const g = L.grid;
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = g[y][x]; if (!c) continue;
    const v = lum(c); g[y][x] = c.length > 3 ? [v, v, v, c[3]] : [v, v, v]; }
  for (const [k, c] of L.ext) { const v = lum(c); L.ext.set(k, c.length > 3 ? [v, v, v, c[3]] : [v, v, v]); } }

function boundedMono(index, record = true, fork = null) {
  const L = S.layers[index], bounds = layerContentBounds(index); if (!bounds) return;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let y = bounds.miny; y <= bounds.maxy; y++) for (let x = bounds.minx; x <= bounds.maxx; x++) {
    const c = L.grid[y]?.[x]; if (!c) continue; const v = lum(c);
    if (c[0] === v && c[1] === v && c[2] === v) continue;
    if (record) recordPixelBefore(index, x, y, c);
    const row = fork?.writableRow(y) || L.grid[y];
    row[x] = c.length > 3 ? [v, v, v, c[3]] : [v, v, v];
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  if (maxx >= minx) markDirty(index, { minx, miny, maxx, maxy });
}

function beginReferenceEdit(layers, indices) {
  if (indices.length !== layers.length || layers.some((layer) =>
    !isTextLayer(layer) && layer.kind && layer.kind !== 'pixel') ||
    !snapshotRasterReferences(indices)) return null;
  const text = layers.filter(isTextLayer), textSet = new Set(text);
  rasterizeTextTargets(text);
  const forks = new Map();
  for (const index of indices) { const layer = S.layers[index];
    if (!textSet.has(layer)) { const fork = forkRasterRows(layer.grid,
        layerContentBounds(index));
      layer.grid = fork.grid; forks.set(index, fork); }
    layer.ext = new Map(layer.ext);
  }
  return forks;
}

function monoExt(layer) {
  for (const [key, c] of layer.ext) { const v = lum(c);
    layer.ext.set(key, c.length > 3 ? [v, v, v, c[3]] : [v, v, v]); }
}

function applyMono(targets) {
  const layers = [...new Set(targets)].filter((layer) => layer?.grid);
  const indices = layers.map((layer) => S.layers.indexOf(layer)).filter((index) => index >= 0);
  const canPatch = indices.length === layers.length && indices.every((index) =>
    S.layers[index].kind === 'pixel' && !S.layers[index].ext.size);
  const local = canPatch && beginPixelBatch(indices);
  const forks = local ? null : beginReferenceEdit(layers, indices);
  if (local) { for (const index of indices) boundedMono(index);
    commitPixelPatch(); }
  else if (forks) { for (const index of indices) {
      boundedMono(index, false, forks.get(index)); monoExt(S.layers[index]); }
    dirtyAll({ preserveGridBounds: true }); }
  else { snapshot(); for (const layer of layers) toMono(layer); dirtyAll(); }
  bus.emitDoc();
}

export function monoLayer(L) { applyMono([L]); toast(t('toast.layerMono')); }
export function monoAll() { applyMono(S.layers); toast(t('toast.monoAll')); }

export function monoTargets(targets) { applyMono(targets); toast(t('toast.mono')); }
actions.register('effect.mono', (targets) => (targets && targets.length) ? monoTargets(targets) : monoAll());
