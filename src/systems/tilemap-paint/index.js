// Draw on Tile/Edit All Tiles: пиксельное рисование по tilemap-слою.
// Глобальный обработчик перехватывает pencil/eraser/fill на активном Tilemap:
//  Edit All Tiles — пишем в source тайла клетки (обновляются все экземпляры);
//  Draw on Tile — клетка получает локальный tileId-вариант и дальше правится одна.
// Пустая клетка/локальный вариант → создаётся новый тайл; если штрих оставил его
// пустым — тайл удаляется (пустая клетка тайла не порождает).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { setTool } from '../../core/tools.js';
import { registerGlobal } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { getTileset, getTile, addTile, deleteTile, findTileByGrid } from '../../core/tileset.js';
import { isTilemap, inMap, getCell, refreshTile, rasterLayer, layersUsingTile } from '../../core/tilemap.js';
import { invTransformCoord, cellFlags } from '../../logic/tile-transform.js';
import { floodRegion } from '../../logic/flood.js';
import { blendOver } from '../../logic/raster.js';
import { afterStroke } from '../draw/stroke.js';
import { brushStampWith, resetScatter } from '../draw/brush.js';

const active = () => S.layers[S.cur];
// пиксельные инструменты на tilemap-слое всегда идут сюда (иначе писали бы в кеш
// grid и затирались при пересборке). Режим правки — S.tileAutoMode.
const applicable = () => isTilemap(active()) && (S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'fill');

let st = null; // { ts, li, created:Set, touched:Set, seen:Set, last:[gx,gy] }

function setTileId(tm, cx, cy, id, local = false) {
  const c = tm.cells[cy * tm.mapW + cx];
  if (c) { c.tileId = id; if (local) c.local = true; else delete c.local; }
  else {
    const cell = { tileId: id, flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };
    if (local) cell.local = true;
    tm.cells[cy * tm.mapW + cx] = cell;
  }
}

function tileUseCount(tileId) {
  let n = 0;
  for (const L of S.layers) { if (!isTilemap(L) || L.tilemap.tilesetId !== st.ts.id) continue;
    for (const c of L.tilemap.cells) if (c && c.tileId === tileId) n++; }
  return n;
}

function makeLocalVariant(tm, cx, cy, cell) {
  const src = getTile(st.ts, cell.tileId);
  const tl = addTile(st.ts, src ? src.grid : undefined, { name: src?.name || '', groupId: src?.groupId ?? null, weight: src?.weight });
  setTileId(tm, cx, cy, tl.id, true);
  st.created.add(tl.id); st.touched.add(cell.tileId);
  S.activeTile = { tilesetId: st.ts.id, tileId: tl.id };
  return tl;
}

// тайл, в source которого пишем для клетки (cx,cy) согласно режиму
function targetTile(cx, cy) {
  const tm = active().tilemap, ts = st.ts, cell = getCell(tm, cx, cy);
  if (!cell || cell.tileId == null) { const tl = addTile(ts); setTileId(tm, cx, cy, tl.id, true); st.created.add(tl.id);
    S.activeTile = { tilesetId: ts.id, tileId: tl.id }; return tl; }
  if (S.tileAutoMode !== 'manual' && (!cell.local || tileUseCount(cell.tileId) > 1)) return makeLocalVariant(tm, cx, cy, cell);
  return getTile(ts, cell.tileId);
}

function paintPx(gx, gy, erase) {
  const ts = st.ts; const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  if (!inMap(active().tilemap, cx, cy)) return;
  const tile = targetTile(cx, cy); if (!tile) return;
  const flags = cellFlags(getCell(active().tilemap, cx, cy));
  const [sx, sy] = ts.tileW === ts.tileH ? invTransformCoord(gx - cx * ts.tileW, gy - cy * ts.tileH, ts.tileW, flags) : [gx - cx * ts.tileW, gy - cy * ts.tileH];
  if (sx < 0 || sy < 0 || sx >= ts.tileW || sy >= ts.tileH) return;
  const br = S.brushes[erase ? 'eraser' : 'pencil'], op = br ? br.op : 1, key = tile.id + ':' + sx + ':' + sy;
  if (op < 1) { if (st.seen.has(key)) return; st.seen.add(key); }
  const dst = tile.grid[sy][sx];
  if (erase) {
    if (op >= 1) tile.grid[sy][sx] = null;
    else if (dst) { const a1 = ((dst.length > 3 ? dst[3] : 255) / 255) * (1 - op);
      tile.grid[sy][sx] = a1 < .04 ? null : [dst[0], dst[1], dst[2], Math.round(a1 * 255)]; }
  } else {
    const col = [S.active[0], S.active[1], S.active[2], 255];
    tile.grid[sy][sx] = op >= 1 ? col : blendOver(col, dst, op);
  }
  st.touched.add(tile.id);
}

function dab(gx, gy, erase) {
  brushStampWith(gx, gy, erase ? 'eraser' : 'pencil', paintPx, erase);
}

// интерполяция между точками штриха, чтобы не было разрывов на быстром движении
function line(x0, y0, x1, y1, erase) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { dab(x, y, erase); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// заливка ОДНОЙ клетки (тайла) — связная область внутри одного тайла, не по всему
// слою (на обычном слое заливка остаётся обычной — этот обработчик не сработает)
function fillCell(gx, gy) { const ts = st.ts, cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  if (!inMap(active().tilemap, cx, cy)) return;
  const tile = targetTile(cx, cy); if (!tile) return;
  const flags = cellFlags(getCell(active().tilemap, cx, cy));
  const [sx, sy] = ts.tileW === ts.tileH ? invTransformCoord(gx - cx * ts.tileW, gy - cy * ts.tileH, ts.tileW, flags) : [gx - cx * ts.tileW, gy - cy * ts.tileH];
  if (sx < 0 || sy < 0 || sx >= ts.tileW || sy >= ts.tileH) return;
  const col = [S.active[0], S.active[1], S.active[2], 255];
  for (const [px, py] of floodRegion(tile.grid, sx, sy)) tile.grid[py][px] = col;
  st.touched.add(tile.id); }

function finishStroke() {
  for (const id of st.created) { const tl = getTile(st.ts, id); if (tl && tl.grid.every((r) => r.every((c) => !c))) clearTile(id); } // пустой созданный тайл → удалить
  for (const id of st.created) dedupe(id); // одинаковые версии в палитру не попадают
  flush(); bus.emit('tileset-changed'); afterStroke(); st = null;
}

// Edit All Tiles не работает на пустой клетке: сразу включаем Draw on Tile (новый тайл создастся
// сам, попадёт в палитру и продолжит обновляться по мере рисования)
function autoOnEmpty(ts, gx, gy, erase) {
  if (S.tileAutoMode !== 'manual' || erase) return;
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH), tm = active().tilemap;
  if (!inMap(tm, cx, cy)) return; const cell = getCell(tm, cx, cy);
  if (!cell || cell.tileId == null) { S.tileAutoMode = 'auto'; bus.emit('tileset-changed'); }
}

const handler = {
  down({ gx, gy, e }) { if (!applicable()) return false;
    const ts = getTileset(active().tilemap.tilesetId); if (!ts) return false;
    const erase = S.tool === 'eraser' || (e && e.button === 2);
    autoOnEmpty(ts, gx, gy, erase);
    snapshot(); resetScatter(); st = { ts, li: S.cur, created: new Set(), touched: new Set(), seen: new Set(), last: [gx, gy] };
    if (S.tool === 'fill') { fillCell(gx, gy); finishStroke(); return true; } // заливка — на одну клетку, разово
    dab(gx, gy, erase); flush(); return true; },
  move({ gx, gy, e }) { if (!st) return; const erase = S.tool === 'eraser' || (e && e.buttons === 2);
    line(st.last[0], st.last[1], gx, gy, erase); st.last = [gx, gy]; flush(); },
  up() { if (st) finishStroke(); },
};

function clearTile(id) { deleteTile(st.ts, id); const tm = active().tilemap;
  tm.cells = tm.cells.map((c) => (c && c.tileId === id ? null : c)); st.touched.add(id);
  if (S.activeTile?.tilesetId === st.ts.id && S.activeTile.tileId === id) S.activeTile = null; }

// Если созданная локальная версия совпала с уже существующей — оставляем один
// tileId. Отличающиеся хотя бы на пиксель версии остаются отдельными тайлами.
function dedupe(id) { const tl = getTile(st.ts, id); if (!tl) return;
  const match = findTileByGrid(st.ts, tl.grid); if (!match || match.id === id) return;
  for (const li of layersUsingTile(st.ts.id, id)) { const tm = S.layers[li].tilemap;
    tm.cells.forEach((c) => { if (c && c.tileId === id) { c.tileId = match.id; delete c.local; } }); rasterLayer(li); }
  deleteTile(st.ts, id); st.touched.add(match.id);
  if (S.activeTile?.tilesetId === st.ts.id && S.activeTile.tileId === id) S.activeTile = { tilesetId: st.ts.id, tileId: match.id }; }
function flush() { for (const id of st.touched) refreshTile(st.ts.id, id); rasterLayer(st.li); bus.emit('render'); }

registerGlobal(handler);
// Режим пиксельной правки тайлов; переключение выбирает карандаш для правки.
actions.register('tile.manual', () => { S.tileAutoMode = 'manual'; setTool('pencil'); bus.emit('tileset-changed'); });
actions.register('tile.auto', () => { S.tileAutoMode = 'auto'; setTool('pencil'); bus.emit('tileset-changed'); });
