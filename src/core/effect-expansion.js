import { S } from './state.js';
import { layerContentBounds } from './layer-cache.js';
import { folderChain } from './layers.js';
import { effectReach } from '../logic/layer-effects.js';
import { gridBounds } from '../logic/raster.js';

const zero = () => ({ pl: 0, pt: 0, pr: 0, pb: 0 });
const merge = (a, b) => !a ? b : ({
  minx: Math.min(a.minx, b.minx), miny: Math.min(a.miny, b.miny),
  maxx: Math.max(a.maxx, b.maxx), maxy: Math.max(a.maxy, b.maxy),
});

function layerBounds(layer) {
  const index = S.layers.indexOf(layer);
  return index >= 0 ? layerContentBounds(index) : gridBounds(layer.grid);
}

function targetBounds(target) {
  if ('grid' in target) return layerBounds(target);
  let bounds = null;
  for (const layer of S.layers) {
    if (!folderChain(layer.fid).some((folder) => folder.id === target.id)) continue;
    const next = layerBounds(layer); if (next) bounds = merge(bounds, next);
  }
  return bounds;
}

export function effectExpansion(target, effects = target?.effects) {
  if (!target || !effects?.length) return zero();
  const bounds = targetBounds(target); if (!bounds) return zero();
  const reach = effectReach(effects);
  return {
    pl: Math.max(0, reach.l - bounds.minx), pt: Math.max(0, reach.t - bounds.miny),
    pr: Math.max(0, bounds.maxx + reach.r - (S.W - 1)),
    pb: Math.max(0, bounds.maxy + reach.b - (S.H - 1)),
  };
}

export function needsEffectExpansion(target, effects = target?.effects) {
  return Object.values(effectExpansion(target, effects)).some(Boolean);
}
