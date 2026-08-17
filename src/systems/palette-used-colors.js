import { S } from '../core/state.js';
import { effVis } from '../core/layers.js';
import { layerContentBounds, layerRev } from '../core/layer-cache.js';

let layerCache = new WeakMap();
const colorKey = (color) => color ? color[0] + ',' + color[1] + ',' + color[2] : '';

function scanLayer(layer, index) {
  const revision = layerRev(index), cached = layerCache.get(layer);
  if (cached?.revision === revision) return cached.colors;
  const colors = new Set(), bounds = layerContentBounds(index);
  if (bounds) for (let y = bounds.miny; y <= bounds.maxy; y++) {
    const row = layer.grid[y];
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      const color = row[x]; if (color && color[3] > 0) colors.add(colorKey(color));
    }
  }
  for (const color of (layer.ext || new Map()).values()) {
    if (color && color[3] > 0) colors.add(colorKey(color));
  }
  layerCache.set(layer, { revision, colors }); return colors;
}

export function usedColorKeys() {
  const colors = new Set();
  for (let index = 0; index < S.layers.length; index++) {
    const layer = S.layers[index];
    if (!layer || !effVis(index) || layer.opacity <= 0) continue;
    for (const key of scanLayer(layer, index)) colors.add(key);
  }
  return colors;
}

export function resetUsedColorCache() { layerCache = new WeakMap(); }
