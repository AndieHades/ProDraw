// Sparse backup for destructive canvas adjustment previews. Transparent canvas
// area is never copied or revisited; the caller owns transaction boundaries.
import { S } from './state.js';
import { layerContentBounds, markDirty } from './layer-cache.js';
import { recordPixelBefore } from './history.js';
import { adjustColor } from '../logic/adjustment.js';

export function captureAdjustmentLayers() {
  return S.layers.map((L, index) => {
    const bounds = layerContentBounds(index), cells = new Map();
    if (bounds) for (let y = bounds.miny; y <= bounds.maxy; y++)
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        const cell = L.grid[y]?.[x]; if (cell) cells.set(y * S.W + x, cell.slice());
      }
    return { L, index, bounds, cells,
      ext: new Map([...L.ext].map(([key, cell]) => [key, cell.slice()])) };
  });
}

export function writeAdjustmentLayers(backup, params = null, record = false) {
  for (const item of backup) { const { L, index, bounds, cells, ext } = item;
    for (const [key, source] of cells) { const x = key % S.W, y = Math.floor(key / S.W);
      if (record) recordPixelBefore(index, x, y, L.grid[y][x]);
      L.grid[y][x] = params ? adjustColor(source, params) : source.slice(); }
    L.ext = new Map([...ext].map(([key, source]) =>
      [key, params ? adjustColor(source, params) : source.slice()]));
    if (bounds) markDirty(index, bounds); else if (ext.size) markDirty(index); }
}
