// Операции над выбранной клеткой (S.tileSel) для Tilemap-контекста. Работают и на
// Tile-слое (экземпляр/тайл), и на обычном слое (пиксельный блок клетки):
// Add tile / Flip X / Flip Y / Rotate / Select / Fill / Clear. Размер клетки — ctxTileSize.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { markDirty } from '../../core/layer-cache.js';
import { effVis } from '../../core/layers.js';
import { getTileset, getTile, addTileUnique } from '../../core/tileset.js';
import { createTileVariantCell } from '../../core/tile-variant.js';
import { isTilemap, getCell, rasterLayer, refreshTile, composeCell, cellIndex, inMap, gridTileSize, tilesetForSize } from '../../core/tilemap.js';

// все видимые слои снизу вверх — «всё, что сейчас есть на клетке» для Add tile
const visibleIdxs = () => S.layers.map((_, i) => i).filter((i) => effVis(i) && S.layers[i].opacity > 0);

export function ctxTileSize() { const L = S.layers[S.cur];
  if (isTilemap(L)) { const ts = getTileset(L.tilemap.tilesetId); if (ts) return { w: ts.tileW, h: ts.tileH }; }
  return gridTileSize(); }
const rectOf = (cx, cy) => { const { w, h } = ctxTileSize(); return { x0: cx * w, y0: cy * h, w, h }; };
const col = () => [S.active[0], S.active[1], S.active[2], 255];
function eachPx(L, cx, cy, fn) { const r = rectOf(cx, cy);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const sx = r.x0 + x, sy = r.y0 + y; if (sx < S.W && sy < S.H) fn(L.grid, sx, sy, x, y); } }

// клетка пуста (по композиту ВСЕХ видимых слоёв — всё, что есть на клетке)?
export function cellEmptyAt(cx, cy) { const { w, h } = ctxTileSize();
  const g = composeCell(visibleIdxs(), cx, cy, w, h); return !g || g.every((r) => r.every((c) => !c)); }

// Add tile: композит клетки по ВСЕМ видимым слоям → новый тайл (дедуп по битмапу;
// отражённый/повёрнутый — другой битмап, добавляется)
export function addToSet() {
  const idxs = visibleIdxs(); if (!idxs.length) return; const s = S.tileSel; if (!s) { toast(t('toast.pickCell')); return; }
  const { w, h } = ctxTileSize(); const grid = composeCell(idxs, s.x0, s.y0, w, h);
  if (!grid || grid.every((r) => r.every((c) => !c))) { toast(t('toast.cellEmpty')); return; }
  const L = S.layers[S.cur], ts = isTilemap(L) ? getTileset(L.tilemap.tilesetId) : tilesetForSize(w, h);
  if (!ts) return; snapshot(); const res = addTileUnique(ts, grid);
  S.activeTile = { tilesetId: ts.id, tileId: res.tile.id };
  bus.emit('tileset-changed'); bus.emit('render'); toast(t(res.added ? 'toast.tileAdded' : 'toast.tileExists'));
}

function flipBlock(L, cx, cy, axis) { const r = rectOf(cx, cy), buf = [];
  for (let y = 0; y < r.h; y++) { buf[y] = []; for (let x = 0; x < r.w; x++) { const sx = r.x0 + x, sy = r.y0 + y; buf[y][x] = (sx < S.W && sy < S.H && L.grid[sy][sx]) ? L.grid[sy][sx].slice() : null; } }
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const sx = r.x0 + x, sy = r.y0 + y; if (sx >= S.W || sy >= S.H) continue;
    const c = axis === 'x' ? buf[y][r.w - 1 - x] : buf[r.h - 1 - y][x]; L.grid[sy][sx] = c ? c.slice() : null; }
  markDirty(S.cur); }
function transformTilemapCell(op) {
  const s = S.tileSel, L = S.layers[S.cur]; if (!s || !isTilemap(L) || !inMap(L.tilemap, s.x0, s.y0)) return false;
  const cell = getCell(L.tilemap, s.x0, s.y0), ts = getTileset(L.tilemap.tilesetId);
  if (!cell || cell.tileId == null || !ts || !getTile(ts, cell.tileId)) return false;
  snapshot();
  const res = createTileVariantCell(ts, cell, op); if (!res) return false;
  S.activeTile = { tilesetId: ts.id, tileId: res.tile.id };
  L.tilemap.cells[cellIndex(L.tilemap, s.x0, s.y0)] = res.cell;
  rasterLayer(S.cur);
  bus.emit('tileset-changed'); bus.emit('render');
  return true;
}
function flipCell(axis) { const s = S.tileSel; if (!s) return;
  if (isTilemap(S.layers[S.cur])) { transformTilemapCell(axis === 'x' ? 'flipH' : 'flipV'); return; }
  snapshot(); flipBlock(S.layers[S.cur], s.x0, s.y0, axis); bus.emit('render'); }
export const cellFlipH = () => flipCell('x');
export const cellFlipV = () => flipCell('y');
export const cellRotate = () => transformTilemapCell('rot90');

export function cellClear() { const s = S.tileSel; if (!s) return; snapshot();
  if (isTilemap(S.layers[S.cur])) { const L = S.layers[S.cur]; if (inMap(L.tilemap, s.x0, s.y0)) { L.tilemap.cells[cellIndex(L.tilemap, s.x0, s.y0)] = null; rasterLayer(S.cur); } }
  else { eachPx(S.layers[S.cur], s.x0, s.y0, (g, sx, sy) => { g[sy][sx] = null; }); markDirty(S.cur); }
  bus.emit('render'); }

// Fill: заполнить активным цветом все СВОБОДНЫЕ пиксели клетки
export function cellFill() { const s = S.tileSel; if (!s) return; snapshot(); const c = col(), L = S.layers[S.cur];
  if (isTilemap(L)) { const ts = getTileset(L.tilemap.tilesetId), cell = getCell(L.tilemap, s.x0, s.y0), tile = cell && getTile(ts, cell.tileId);
    if (tile) { for (let y = 0; y < ts.tileH; y++) for (let x = 0; x < ts.tileW; x++) if (!tile.grid[y][x]) tile.grid[y][x] = c.slice(); refreshTile(ts.id, tile.id); } }
  else { eachPx(L, s.x0, s.y0, (g, sx, sy) => { if (!g[sy][sx]) g[sy][sx] = c.slice(); }); markDirty(S.cur); }
  bus.emit('render'); }

// Select: клетка → пиксельное выделение (копировать/вырезать/удалить обычным буфером)
export function cellSelect() { const s = S.tileSel; if (!s) return; const r = rectOf(s.x0, s.y0);
  S.sel = { x0: r.x0, y0: r.y0, x1: Math.min(S.W, r.x0 + r.w) - 1, y1: Math.min(S.H, r.y0 + r.h) - 1 };
  S.selMask = null; S.tileSel = null; bus.emit('selection'); bus.emit('render'); }
