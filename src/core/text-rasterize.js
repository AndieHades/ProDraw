import { S } from './state.js';
import * as bus from './bus.js';
import { snapshot } from './history.js';
import { markDirty } from './layer-cache.js';
import { rasterizeTextLayer } from './text-layer.js';
import { isTextLayer } from '../logic/text-model.js';

export function rasterizeTextAt(index, opts = {}) {
  const L = S.layers[index];
  if (!isTextLayer(L)) return false;
  if (opts.history) snapshot();
  rasterizeTextLayer(L, S.W, S.H, opts.fonts);
  markDirty(index);
  if (opts.emit) bus.emitDoc();
  return true;
}

export const rasterizeActiveText = (opts = {}) => rasterizeTextAt(S.cur, opts);

export function rasterizeTextTargets(targets, opts = {}) {
  return rasterizeMatchingText((L) => targets.includes(L), opts);
}

export function rasterizeMatchingText(predicate, opts = {}) {
  let hit = false;
  S.layers.forEach((L, i) => {
    if (isTextLayer(L) && predicate(L, i)) hit = rasterizeTextAt(i, { ...opts, emit: false }) || hit;
  });
  if (hit && opts.emit) bus.emitDoc();
  return hit;
}
