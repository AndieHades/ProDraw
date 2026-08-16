// Мгновенные Flip/Rotate для активного выделения. Для обычного слоя двигаем
// пиксели, для Tilemap — клетки и bitmap-версии тайлов, не растровый кеш.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { snapshot } from '../core/history.js';
import { markDirty } from '../core/layer-cache.js';
import { parseKey } from '../logic/raster.js';
import { cloneCell } from '../logic/tilemap-data.js';
import { getTileset } from '../core/tileset.js';
import { createTileVariantCell } from '../core/tile-variant.js';
import { isTilemap, inMap, getCell, cellIndex, rasterLayer } from '../core/tilemap.js';
import { commitFloat } from './selection/float.js';

const key = (x, y) => x + ',' + y;
const cloneSel = (s) => (s ? { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 } : null);
const cloneMask = (m) => (m ? new Set(m) : null);
const cloneColor = (c) => (c ? c.slice() : null);

function setSelectionFromPixels(set) {
  if (!set.size) { S.sel = null; S.selMask = null; return; }
  let x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (const k of set) { const [x, y] = parseKey(k);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  S.sel = { x0, y0, x1, y1 };
  const full = set.size === (x1 - x0 + 1) * (y1 - y0 + 1);
  S.selMask = full ? null : set;
}

function selectedPixels(sel, mask) {
  const out = [];
  if (mask) { for (const k of mask) { const [x, y] = parseKey(k); if (x >= 0 && y >= 0 && x < S.W && y < S.H) out.push([x, y]); } return out; }
  for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) out.push([x, y]);
  return out;
}

function rotPointInRect(x, y, r) {
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  const lx = x - r.x0, ly = y - r.y0;
  const dx = Math.round((w - h) / 2), dy = Math.round((h - w) / 2);
  return [r.x0 + h - 1 - ly + dx, r.y0 + lx + dy];
}

function transformPixelSelection(L, mapPoint) {
  const sel = cloneSel(S.sel), mask = cloneMask(S.selMask), coords = selectedPixels(sel, mask);
  const items = coords.map(([x, y]) => ({ x, y, c: cloneColor(L.grid[y] && L.grid[y][x]) }));
  for (const { x, y } of items) if (L.grid[y] && x >= 0 && x < L.grid[y].length) L.grid[y][x] = null;
  const nextMask = new Set();
  for (const it of items) {
    const [nx, ny] = mapPoint(it.x, it.y, sel);
    if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) {
      nextMask.add(key(nx, ny));
      if (it.c) L.grid[ny][nx] = it.c;
    } else if (it.c) L.ext.set(key(nx, ny), it.c);
  }
  markDirty(S.cur); setSelectionFromPixels(nextMask);
}

function selectedTileCells(L, sel, mask) {
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const cells = new Set(), tm = L.tilemap;
  if (mask) for (const k of mask) { const [x, y] = parseKey(k), cx = Math.floor(x / ts.tileW), cy = Math.floor(y / ts.tileH);
    if (inMap(tm, cx, cy)) cells.add(key(cx, cy)); }
  else {
    const x0 = Math.max(0, Math.floor(sel.x0 / ts.tileW)), y0 = Math.max(0, Math.floor(sel.y0 / ts.tileH));
    const x1 = Math.min(tm.mapW - 1, Math.floor(sel.x1 / ts.tileW)), y1 = Math.min(tm.mapH - 1, Math.floor(sel.y1 / ts.tileH));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) cells.add(key(cx, cy));
  }
  if (!cells.size) return null;
  let x0 = tm.mapW, y0 = tm.mapH, x1 = -1, y1 = -1;
  for (const k of cells) { const [cx, cy] = parseKey(k);
    if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy; }
  return { ts, cells, rect: { x0, y0, x1, y1 } };
}

function setSelectionFromTileCells(cells, ts) {
  const px = new Set();
  for (const k of cells) { const [cx, cy] = parseKey(k);
    const x0 = cx * ts.tileW, y0 = cy * ts.tileH, x1 = Math.min(S.W, x0 + ts.tileW), y1 = Math.min(S.H, y0 + ts.tileH);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.add(key(x, y));
  }
  setSelectionFromPixels(px);
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
  } else { snapshot(); transformPixelSelection(L, (x, y, r) => (horiz ? [r.x1 - (x - r.x0), y] : [x, r.y1 - (y - r.y0)])); }
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
  } else { snapshot(); transformPixelSelection(L, rotPointInRect); }
  bus.emit('selection'); bus.emit('render'); bus.emit('layers'); return true;
}
