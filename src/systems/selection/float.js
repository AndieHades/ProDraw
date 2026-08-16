// Плавающий фрагмент выделения: поднять из слоя, нести (в т.ч. зеркально),
// положить обратно. Мутирует G и S.selFloat; жесты — в ./input.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { parseKey } from '../../logic/raster.js';
import { symA, symHA } from '../../core/layers.js';
import { markDirty } from '../../core/layer-cache.js';

export function liftSelection() { const L = S.layers[S.cur]; if (!L) return; const g = L.grid, w = S.sel.x1 - S.sel.x0 + 1, h = S.sel.y1 - S.sel.y0 + 1;
  const cells = new Map();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (S.selMask && !S.selMask.has((S.sel.x0 + x) + ',' + (S.sel.y0 + y))) continue;
    const c = g[S.sel.y0 + y][S.sel.x0 + x]; if (c) { cells.set(x + ',' + y, c); g[S.sel.y0 + y][S.sel.x0 + x] = null; } }
  if (!S.selMask) for (const [k, c] of [...L.ext]) { const [ax, ay] = parseKey(k);
    const grab = (S.sel.x1 === S.W - 1 && ax >= S.W && ay >= S.sel.y0 && ay <= S.sel.y1)
      || (S.sel.x0 === 0 && ax < 0 && ay >= S.sel.y0 && ay <= S.sel.y1)
      || (S.sel.y1 === S.H - 1 && ay >= S.H && ax >= S.sel.x0 && ax <= S.sel.x1)
      || (S.sel.y0 === 0 && ay < 0 && ax >= S.sel.x0 && ax <= S.sel.x1);
    if (grab) { cells.set((ax - S.sel.x0) + ',' + (ay - S.sel.y0), c); L.ext.delete(k); } }
  S.selMask = null; S.selFloat = { cells, w, h, x: S.sel.x0, y: S.sel.y0, ox: S.sel.x0, oy: S.sel.y0, li: S.cur }; markDirty(S.cur); }

export function liftSelectionSym(grabX, grabY) { const L = S.layers[S.cur]; if (!L) return; const g = L.grid, gL = grabX * 2 <= S.W - 1, gT = grabY * 2 <= S.H - 1, items = [];
  for (const k of S.selMask) { const [x, y] = parseKey(k); const c = g[y] && g[y][x]; if (!c) continue; g[y][x] = null;
    const sgnx = symA() ? (x === S.W - 1 - x ? 0 : ((x * 2 <= S.W - 1) === gL ? 1 : -1)) : 1;
    const sgny = symHA() ? (y === S.H - 1 - y ? 0 : ((y * 2 <= S.H - 1) === gT ? 1 : -1)) : 1;
    items.push({ ax: x, ay: y, c, sgnx, sgny }); }
  S.selMask = null; S.selFloat = { symItems: items, dx: 0, dy: 0, li: S.cur }; markDirty(S.cur); }

export function symFloatBounds() { let x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (const it of S.selFloat.symItems) { const xx = it.ax + it.sgnx * S.selFloat.dx, yy = it.ay + it.sgny * S.selFloat.dy;
    if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  S.sel = x1 < 0 ? null : { x0, y0, x1, y1 }; }

// фрагмент оседает в слой-источник (li), даже если активный слой успел смениться
export function commitFloat() { if (!S.selFloat) return; const li = S.selFloat.li ?? S.cur, L = S.layers[li], g = L.grid, landed = new Set();
  if (S.selFloat.symItems) { for (const it of S.selFloat.symItems) { const xx = it.ax + it.sgnx * S.selFloat.dx, yy = it.ay + it.sgny * S.selFloat.dy;
    if (xx >= 0 && yy >= 0 && xx < S.W && yy < S.H) { g[yy][xx] = it.c; landed.add(xx + ',' + yy); } else L.ext.set(xx + ',' + yy, it.c); } }
  else for (const [k, c] of S.selFloat.cells) { const [dx, dy] = parseKey(k); const xx = S.selFloat.x + dx, yy = S.selFloat.y + dy;
    if (xx >= 0 && yy >= 0 && xx < S.W && yy < S.H) { g[yy][xx] = c; landed.add(xx + ',' + yy); } else L.ext.set(xx + ',' + yy, c); }
  S.selMask = landed.size ? landed : null; S.selFloat = null; markDirty(li); bus.emit('layers'); }

// поднятый фрагмент живёт между жестами — оседает при смене инструмента и перед undo/redo
bus.on('tool', () => commitFloat());
bus.on('before-undo', () => commitFloat());
