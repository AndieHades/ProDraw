import { S } from './state.js';
import * as bus from './bus.ts';
import { snapshotRasterReferences } from './history.js';
import { markDirty } from './layer-cache.js';
import { rasterizeTextLayer, textLayerBounds } from './text-layer.js';
import { isTextLayer } from '../logic/text-model.ts';
import { gridBoundsMetadata, setGridBounds } from '../logic/raster.js';

export function rasterizeTextAt(index, opts = {}) {
  const L = S.layers[index];
  if (!isTextLayer(L)) return false;
  if (opts.history && !snapshotRasterReferences([index])) return false;
  const damage = textLayerBounds(L, S.W, S.H);
  rasterizeTextLayer(L, S.W, S.H, opts.fonts);
  const bounds = gridBoundsMetadata(L.grid);
  markDirty(index, damage);
  if (bounds) setGridBounds(L.grid, bounds.bounds, bounds.exact);
  if (opts.emit) bus.emitDoc();
  return true;
}

export const rasterizeActiveText = (opts = {}) => rasterizeTextAt(S.cur, opts);

export function rasterizeTextTargets(targets, opts = {}) {
  return rasterizeMatchingText((L) => targets.includes(L), opts);
}

export function rasterizeMatchingText(predicate, opts = {}) {
  const indices = [];
  S.layers.forEach((layer, index) => {
    if (isTextLayer(layer) && predicate(layer, index)) indices.push(index);
  });
  if (!indices.length || (opts.history && !snapshotRasterReferences(indices))) return false;
  let hit = false;
  for (const index of indices) hit = rasterizeTextAt(index,
    { ...opts, history: false, emit: false }) || hit;
  if (hit && opts.emit) bus.emitDoc();
  return hit;
}
