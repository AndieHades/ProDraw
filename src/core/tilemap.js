// Движок tilemap-слоя: пересобирает пиксельный кеш L.grid из cells + тайлсета
// (через logic/tilemap-raster) и помечает слой грязным. Здесь же — авто-
// обновление всех экземпляров tileId при правке source tile (§6 задачи).
import { S, blank } from './state.js';
import { markDirty } from './layer-cache.js';
import { getTileset, tileGrid, getTile, createTileset } from './tileset.js';
import { t } from './dom.js';
import { rasterTilemap } from '../logic/tilemap-raster.js';
import { cloneCell } from '../logic/tilemap-data.js';
import { transformTile, cellFlags } from '../logic/tile-transform.js';
import { blendOver } from '../logic/raster.js';

export const isTilemap = (L) => !!(L && L.kind === 'tilemap' && L.tilemap);

// размер тайла = квадрат Tileset Grid (отдельно от обычной сетки Grid)
export const gridTileSize = () => ({ w: S.tileGrid.size, h: S.tileGrid.size });
// тайлсет нужного размера тайла: переиспользуем существующий или создаём
export const tilesetForSize = (w, h) => S.tilesets.find((x) => x.tileW === w && x.tileH === h) || createTileset(t('tile.palette') + ' ' + w + '×' + h, w, h);

// создать tilemap-слой документа размера S.W×S.H; tilemap привязан к тайлсету
export function makeTilemapLayer(name, tilesetId, mapW, mapH) {
  const cells = new Array(mapW * mapH).fill(null);
  return { name, grid: blank(S.W, S.H), opacity: 1, visible: true, fid: null, clip: false,
    lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [],
    kind: 'tilemap', tilemap: { tilesetId, mapW, mapH, cells } };
}

// индекс клетки в плоском массиве
export const cellIndex = (tm, cx, cy) => cy * tm.mapW + cx;
export const inMap = (tm, cx, cy) => cx >= 0 && cy >= 0 && cx < tm.mapW && cy < tm.mapH;
export const getCell = (tm, cx, cy) => (inMap(tm, cx, cy) ? tm.cells[cellIndex(tm, cx, cy)] : null);
const tileHasPixels = (tile) => !!(tile && tile.grid.some((r) => r.some((c) => c && (c[3] ?? 255) > 0)));
const liveCell = (tm, cell) => {
  if (!cell || cell.tileId == null) return null;
  return tileHasPixels(getTile(getTileset(tm.tilesetId), cell.tileId)) ? cloneCell(cell) : null;
};
const cleanCells = (tm) => { tm.cells = tm.cells.map((c) => liveCell(tm, c)); };

// Холст изменился: новый (0,0) соответствует старому (x0,y0). Переносим cells
// по целым tile-клеткам и расширяем карту до нового размера холста.
export function remapToCanvas(L, x0, y0, newW, newH) {
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  const old = L.tilemap, mapW = Math.max(1, Math.ceil(newW / ts.tileW)), mapH = Math.max(1, Math.ceil(newH / ts.tileH));
  const dx = Math.round(x0 / ts.tileW), dy = Math.round(y0 / ts.tileH), cells = new Array(mapW * mapH).fill(null);
  for (let cy = 0; cy < old.mapH; cy++) for (let cx = 0; cx < old.mapW; cx++) {
    const cell = liveCell(old, old.cells[cy * old.mapW + cx]); if (!cell) continue;
    const nx = cx - dx, ny = cy - dy; if (nx >= 0 && ny >= 0 && nx < mapW && ny < mapH) cells[ny * mapW + nx] = cell;
  }
  L.tilemap = { ...old, mapW, mapH, cells };
}

// пересобрать пиксельный кеш слоя из его cells и тайлсета; пометить грязным
export function rasterLayer(li) {
  const L = S.layers[li]; if (!isTilemap(L)) return;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  cleanCells(L.tilemap);
  const map = rasterTilemap(L.tilemap, ts.tileW, ts.tileH, (id) => tileGrid(ts.id, id));
  const grid = blank(S.W, S.H); // tilemap кладётся в левый-верхний угол холста, обрезается по краю
  for (let y = 0; y < map.length && y < S.H; y++) for (let x = 0; x < map[0].length && x < S.W; x++) grid[y][x] = map[y][x];
  L.grid = grid; L.ext = new Map(); markDirty(li);
}

// все индексы tilemap-слоёв, где встречается tileId данного тайлсета
export function layersUsingTile(tilesetId, tileId) {
  const out = [];
  S.layers.forEach((L, i) => { if (!isTilemap(L) || L.tilemap.tilesetId !== tilesetId) return;
    if (L.tilemap.cells.some((c) => c && c.tileId === tileId)) out.push(i); });
  return out;
}

// правка source tile → пересобрать все слои с этим tileId (все экземпляры разом)
export function refreshTile(tilesetId, tileId) {
  const ts = getTileset(tilesetId), empty = !tileHasPixels(getTile(ts, tileId));
  for (const i of layersUsingTile(tilesetId, tileId)) {
    if (empty) S.layers[i].tilemap.cells = S.layers[i].tilemap.cells.map((c) => (c && c.tileId === tileId ? null : c));
    rasterLayer(i);
  }
}

// выбранные Tile-слои: активный + отмеченные (ctrl), отфильтрованы по типу,
// снизу вверх — основа покадровых операций над клеткой независимо от числа слоёв
export function tileLayerIdxs() {
  const set = new Set([S.cur, ...S.marked]);
  return [...set].filter((i) => isTilemap(S.layers[i])).sort((a, b) => a - b);
}

// выбранные слои (активный + отмеченные), любого типа, снизу вверх
export function selectedLayerIdxs() {
  const set = new Set([S.cur, ...S.marked]);
  return [...set].filter((i) => S.layers[i]).sort((a, b) => a - b);
}

// собрать содержимое клетки (cx,cy) по нескольким слоям в битмап w×h, наложением
// снизу вверх. Tile-слой → трансформированный тайл; обычный слой → блок пикселей
// клетки. Для «Add to Tileset»: всё нарисованное в квадрате, даже послойно.
export function composeCell(idxs, cx, cy, w, h) {
  const out = blank(w, h);
  for (const i of idxs) { const L = S.layers[i]; if (!L) continue;
    if (isTilemap(L)) { const ts = getTileset(L.tilemap.tilesetId); if (!ts) continue;
      const cell = getCell(L.tilemap, cx, cy); if (!cell || cell.tileId == null) continue;
      const tile = getTile(ts, cell.tileId); if (!tile) continue;
      const g = transformTile(tile.grid, cellFlags(cell));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = g[y] && g[y][x]; if (c) out[y][x] = blendOver(c, out[y][x], 1); }
    } else { const g = L.grid; // обычный слой: пиксельный блок клетки
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sy = cy * h + y, sx = cx * w + x;
        const c = (sy < S.H && sx < S.W && sy >= 0 && sx >= 0) ? g[sy][sx] : null; if (c) out[y][x] = blendOver(c, out[y][x], 1); } }
  }
  return out;
}

// какой tileId ляжет в клетку (cx,cy) текущей кистью — ЕДИНЫЙ источник для
// штампа и превью на кисти (WYSIWYG): зафиксированный random / паттерн / активный
const patternAt = (p, cx, cy) => p.ids[(((cy % p.h) + p.h) % p.h) * p.w + (((cx % p.w) + p.w) % p.w)];
export function rollRandomTile() { const ids = [...S.tileMarks]; if (ids.length) S.tileRandomNext = ids[Math.floor(Math.random() * ids.length)]; }
export function stampTileSource(tilesetId = null) {
  const ok = (a) => a && (tilesetId == null || a.tilesetId === tilesetId);
  return (ok(S.placeTile) && S.placeTile) || (ok(S.activeTile) && S.activeTile) || null;
}

export function stampTileId(cx, cy, tilesetId = null) {
  if (S.tileRandom && S.tileMarks.size) { if (S.tileRandomNext == null || !S.tileMarks.has(S.tileRandomNext)) rollRandomTile(); return S.tileRandomNext; }
  if (S.tilePattern) return patternAt(S.tilePattern, cx, cy);
  const a = stampTileSource(tilesetId);
  return a ? a.tileId : null;
}

// поставить/стереть клетку и пересобрать слой (стирание — cell=null)
export function setCell(li, cx, cy, cell) {
  const L = S.layers[li]; if (!isTilemap(L) || !inMap(L.tilemap, cx, cy)) return;
  L.tilemap.cells[cellIndex(L.tilemap, cx, cy)] = liveCell(L.tilemap, cell);
  rasterLayer(li);
}
