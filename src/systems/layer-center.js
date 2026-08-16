// Автоцентрирование объекта слоя: сдвигает содержимое так, чтобы его габаритный
// центр совпал с центром холста (или центром выделения, если оно активно).
import { S, blank } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { boundsWithExt } from '../logic/raster.js';
import { shiftLayerGrid } from '../core/document.js';
import { markDirty } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';

function layerCell(L, x, y) {
  return x >= 0 && y >= 0 && y < L.grid.length && x < L.grid[0].length ? L.grid[y][x] : L.ext.get(x + ',' + y);
}

function putCell(grid, ext, x, y, c) {
  if (x >= 0 && y >= 0 && x < S.W && y < S.H) grid[y][x] = c;
  else ext.set(x + ',' + y, c);
}

export function centerLayer() {
  const L = S.layers[S.cur]; if (L.lock) return;
  const b = boundsWithExt(L.grid, L.ext); if (!b) { toast(t('toast.layerEmpty')); return; }
  const cx = (b.minx + b.maxx + 1) / 2, cy = (b.miny + b.maxy + 1) / 2; // центр габаритов объекта
  const tx = S.sel ? (S.sel.x0 + S.sel.x1 + 1) / 2 : S.W / 2;            // цель: центр выделения или холста
  const ty = S.sel ? (S.sel.y0 + S.sel.y1 + 1) / 2 : S.H / 2;
  const dx = Math.round(tx - cx), dy = Math.round(ty - cy);
  if (!dx && !dy) { toast(t('toast.centered')); return; }
  snapshot(); shiftLayerGrid(L, dx, dy); markDirty(S.cur); // вне холста — в ext, объект не теряется
  bus.emit('render'); bus.emit('layers'); toast(t('toast.centered'));
}

export function fitLayerShortSide() {
  const L = S.layers[S.cur]; if (L.lock) return;
  const b = boundsWithExt(L.grid, L.ext); if (!b) { toast(t('toast.layerEmpty')); return; }
  const sw = b.maxx - b.minx + 1, sh = b.maxy - b.miny + 1, target = Math.min(S.W, S.H);
  const k = target / Math.min(sw, sh), nw = Math.max(1, Math.round(sw * k)), nh = Math.max(1, Math.round(sh * k));
  const ox = Math.round((S.W - nw) / 2), oy = Math.round((S.H - nh) / 2);
  if (sw === nw && sh === nh && b.minx === ox && b.miny === oy && !L.ext.size) { toast(t('toast.fitShortSide')); return; }
  const grid = blank(S.W, S.H), ext = new Map();
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const sx = b.minx + Math.min(sw - 1, Math.floor(x * sw / nw));
    const sy = b.miny + Math.min(sh - 1, Math.floor(y * sh / nh));
    const c = layerCell(L, sx, sy); if (c) putCell(grid, ext, ox + x, oy + y, c.slice());
  }
  snapshot(); L.grid = grid; L.ext = ext; markDirty(S.cur);
  bus.emit('render'); bus.emit('layers'); toast(t('toast.fitShortSide'));
}

actions.register('layer.center', centerLayer);
actions.register('layer.fitShortSide', fitLayerShortSide);
