// Мгновенные Flip/Rotate для активного выделения. Для обычного слоя двигаем
// пиксели, для Tilemap — клетки и bitmap-версии тайлов, не растровый кеш.
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import { snapshot } from '../core/history.js';
import { parseKey } from '../logic/raster.js';
import { cloneCell } from '../logic/tilemap-data.js';
import { getTileset } from '../core/tileset.js';
import { createTileVariantCell } from '../core/tile-variant.js';
import { isTilemap, inMap, getCell, cellIndex, rasterLayer } from '../core/tilemap.js';
import { commitFloat } from './selection/float.js';
import { selectionIntersectsRect } from '../core/selection.js';
import { SelectionMask, selectionStateFromMask } from '../logic/mask-ops.js';
import { transformPixelSelection } from './selection/pixel-transform.js';

const key = (x, y) => x + ',' + y;

function rotPointInRect(x, y, r) {
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  const lx = x - r.x0, ly = y - r.y0;
  const dx = Math.round((w - h) / 2), dy = Math.round((h - w) / 2);
  return [r.x0 + h - 1 - ly + dx, r.y0 + lx + dy];
}

function selectedTileCells(L, sel, mask) {
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const cells = new Set(), tm = L.tilemap;
  const firstX = Math.max(0, Math.floor(sel.x0 / ts.tileW));
  const firstY = Math.max(0, Math.floor(sel.y0 / ts.tileH));
  const lastX = Math.min(tm.mapW - 1, Math.floor(sel.x1 / ts.tileW));
  const lastY = Math.min(tm.mapH - 1, Math.floor(sel.y1 / ts.tileH));
  for (let cy = firstY; cy <= lastY; cy++) for (let cx = firstX; cx <= lastX; cx++) {
    const rect = { x0: cx * ts.tileW, y0: cy * ts.tileH,
      x1: Math.min(S.W - 1, (cx + 1) * ts.tileW - 1),
      y1: Math.min(S.H - 1, (cy + 1) * ts.tileH - 1) };
    if (!mask || selectionIntersectsRect(sel, mask, rect)) cells.add(key(cx, cy));
  }
  if (!cells.size) return null;
  let x0 = tm.mapW, y0 = tm.mapH, x1 = -1, y1 = -1;
  for (const k of cells) { const [cx, cy] = parseKey(k);
    if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy; }
  return { ts, cells, rect: { x0, y0, x1, y1 } };
}

function setSelectionFromTileCells(cells, ts) {
  const rects = [];
  for (const k of cells) { const [cx, cy] = parseKey(k);
    const x0 = cx * ts.tileW, y0 = cy * ts.tileH, x1 = Math.min(S.W, x0 + ts.tileW), y1 = Math.min(S.H, y0 + ts.tileH);
    rects.push({ x0, y0, x1: x1 - 1, y1: y1 - 1 });
  }
  const state = selectionStateFromMask(new SelectionMask(S.W, S.H, rects));
  S.sel = state?.sel ?? null; S.selMask = state?.mask ?? null;
}

function variantCell(ts, cell, op) {
  const res = createTileVariantCell(ts, cell, op); if (!res) return null;
  S.activeTile = { tilesetId: ts.id, tileId: res.tile.id };
  return res.cell;
}

function transformTileCells(L, info, mapPoint, cellFn, updateSelection = true) {
  if (!info.ts) return;
  const tm = L.tilemap, items = [];
  for (const k of info.cells) { const [cx, cy] = parseKey(k); items.push({ cx, cy, cell: cloneCell(getCell(tm, cx, cy)) }); }
  for (const { cx, cy } of items) if (inMap(tm, cx, cy)) tm.cells[cellIndex(tm, cx, cy)] = null;
  const next = new Set();
  for (const it of items) {
    const [nx, ny] = mapPoint(it.cx, it.cy, info.rect);
    if (!inMap(tm, nx, ny)) continue;
    tm.cells[cellIndex(tm, nx, ny)] = it.cell ? cellFn(info.ts, it.cell) : null;
    next.add(key(nx, ny));
  }
  rasterLayer(S.layers.indexOf(L));
  if (updateSelection) setSelectionFromTileCells(next, info.ts);
  bus.emit('tileset-changed');
}

export function flipTilemapAll(L, horiz) {
  const tm = L.tilemap, cells = new Set();
  for (let cy = 0; cy < tm.mapH; cy++) for (let cx = 0; cx < tm.mapW; cx++) cells.add(key(cx, cy));
  transformTileCells(L, { ts: getTileset(tm.tilesetId), cells, rect: { x0: 0, y0: 0, x1: tm.mapW - 1, y1: tm.mapH - 1 } },
    (cx, cy, r) => (horiz ? [r.x1 - (cx - r.x0), cy] : [cx, r.y1 - (cy - r.y0)]), (ts, cell) => variantCell(ts, cell, horiz ? 'flipH' : 'flipV'), false);
}

export function rotateTilemapAll(L) {
  const tm = L.tilemap, cells = new Set();
  for (let cy = 0; cy < tm.mapH; cy++) for (let cx = 0; cx < tm.mapW; cx++) cells.add(key(cx, cy));
  transformTileCells(L, { ts: getTileset(tm.tilesetId), cells, rect: { x0: 0, y0: 0, x1: tm.mapW - 1, y1: tm.mapH - 1 } },
    rotPointInRect, (ts, cell) => variantCell(ts, cell, 'rot90'), false);
}

export function flipSelection(horiz) {
  if (!S.sel || !S.layers[S.cur]) return false;
  commitFloat();
  const L = S.layers[S.cur];
  if (isTilemap(L)) {
    const info = selectedTileCells(L, S.sel, S.selMask); if (!info) return false;
    snapshot();
    transformTileCells(L, info, (cx, cy, r) => (horiz ? [r.x1 - (cx - r.x0), cy] : [cx, r.y1 - (cy - r.y0)]), (ts, cell) => variantCell(ts, cell, horiz ? 'flipH' : 'flipV'));
  } else if (!transformPixelSelection(L,
    (x, y, r) => (horiz ? [r.x1 - (x - r.x0), y] : [x, r.y1 - (y - r.y0)]))) return false;
  bus.emit('selection'); bus.emit('render'); bus.emit('layers'); return true;
}

export function rotateSelection() {
  if (!S.sel || !S.layers[S.cur]) return false;
  commitFloat();
  const L = S.layers[S.cur];
  if (isTilemap(L)) {
    const info = selectedTileCells(L, S.sel, S.selMask); if (!info) return false;
    snapshot();
    transformTileCells(L, info, rotPointInRect, (ts, cell) => variantCell(ts, cell, 'rot90'));
  } else if (!transformPixelSelection(L, rotPointInRect)) return false;
  bus.emit('selection'); bus.emit('render'); bus.emit('layers'); return true;
}
