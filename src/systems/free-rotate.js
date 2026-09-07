// Свободный поворот слоя с чистыми гранями (RotSprite). Превью — canvas для
// рендера; применение пишет в слой.
import { S, blank } from '../core/state.js';
import * as bus from '../core/bus.ts';
import { snapshot } from '../core/history.js';
import { rotSprite } from '../logic/rotsprite.ts';
import { markDirty } from '../core/layer-cache.js';
import { rasterOwnerForLayer } from '../core/raster/legacyRasterOwner.ts';
import { packRegionToInt32 } from '../logic/raster/regionScan.ts';
import { paintCanvas } from '../core/canvas.js';
import { toast, t } from '../ui/dom/ShellDom.ts';

const intCell = (v) => (v ? [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255] : null);

// Слой читается одним регионом у растрового владельца, а не поячеечно.
export function layerToInt(L) { const src = new Int32Array(S.W * S.H);
  const owner = rasterOwnerForLayer(L); if (!owner) return src;
  packRegionToInt32(owner.readRegion({ minx: 0, miny: 0, maxx: S.W - 1,
    maxy: S.H - 1 }, S.W, S.H), src, S.W);
  return src; }

export function buildRotPreview(L, ang, scale) { const r = rotSprite(layerToInt(L), S.W, S.H, ang, scale);
  const c = paintCanvas(r.w, r.h, (d) => {
    for (let i = 0; i < r.w * r.h; i++) { const v = r.data[i]; if (!v) continue; const o = i * 4;
      d[o] = (v >>> 24) & 255; d[o + 1] = (v >>> 16) & 255; d[o + 2] = (v >>> 8) & 255; d[o + 3] = v & 255; } });
  return { canvas: c, px: Math.round((S.W - r.w) / 2), py: Math.round((S.H - r.h) / 2), ow: r.w, oh: r.h }; }

export function freeRotateLayer(L, ang, scale) { const r = rotSprite(layerToInt(L), S.W, S.H, ang, scale);
  snapshot(); L.grid = blank(S.W, S.H); L.ext = new Map();
  const tx = Math.round((S.W - r.w) / 2), ty = Math.round((S.H - r.h) / 2);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const v = r.data[y * r.w + x]; if (!v) continue;
    const cx = tx + x, cy = ty + y; if (cx >= 0 && cy >= 0 && cx < S.W && cy < S.H) L.grid[cy][cx] = intCell(v); else L.ext.set(cx + ',' + cy, intCell(v)); }
  const i = S.layers.indexOf(L); if (i >= 0) markDirty(i); bus.emit('render'); bus.emit('layers'); toast(t('toast.layerRotated')); }
