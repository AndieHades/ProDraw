// Операции над выделением клеток tilemap: Make Unique, удалить, копировать,
// вставить. Источник истины — cells; после правок слой пересобирается.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { getTileset, getTile, addTile } from '../../core/tileset.js';
import { isTilemap, getCell, rasterLayer, inMap } from '../../core/tilemap.js';
import { cloneCell } from '../../logic/tilemap-data.js';

let clip = null; // { w, h, cells: [cell|null] }

// нормализованный прямоугольник выделения активного слоя или null
export function selRect() { const s = S.tileSel; if (!s || s.li !== S.cur || !isTilemap(S.layers[S.cur])) return null;
  return { x0: Math.min(s.x0, s.x1), y0: Math.min(s.y0, s.y1), x1: Math.max(s.x0, s.x1), y1: Math.max(s.y0, s.y1) }; }

function eachSel(fn) { const r = selRect(); if (!r) return false; const tm = S.layers[S.cur].tilemap;
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (inMap(tm, x, y)) fn(x, y, tm); return true; }

// Make Unique: для каждого исходного tileId в выделении создаём клон-тайл и
// переводим на него выбранные клетки. Старые экземпляры остаются на старом id.
export function makeUnique() {
  const r = selRect(); if (!r) { toast(t('toast.needTilemapLayer')); return; }
  const ts = getTileset(S.layers[S.cur].tilemap.tilesetId); if (!ts) return;
  snapshot(); const map = new Map(); // старый tileId → новый клон
  eachSel((x, y, tm) => { const cell = getCell(tm, x, y); if (!cell || cell.tileId == null) return;
    if (!map.has(cell.tileId)) { const src = getTile(ts, cell.tileId); map.set(cell.tileId, src ? addTile(ts, src.grid, { name: src.name, weight: src.weight }).id : cell.tileId); }
    cell.tileId = map.get(cell.tileId); });
  reraster(); bus.emit('tileset-changed'); toast(t('toast.tileMadeUnique'));
}

export function deleteSel() { if (!selRect()) return; snapshot(); eachSel((x, y) => setCellSilent(x, y, null)); reraster(); }
export function copySel() { const r = selRect(); if (!r) return; const tm = S.layers[S.cur].tilemap;
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push(cloneCell(getCell(tm, r.x0 + x, r.y0 + y)));
  clip = { w, h, cells }; }
export function pasteSel() { if (!clip) return; const r = selRect(); if (!r) return;
  snapshot(); for (let y = 0; y < clip.h; y++) for (let x = 0; x < clip.w; x++) {
    const cell = clip.cells[y * clip.w + x]; setCellSilent(r.x0 + x, r.y0 + y, cell ? cloneCell(cell) : null); }
  reraster(); }

function setCellSilent(x, y, cell) { const tm = S.layers[S.cur].tilemap; if (inMap(tm, x, y)) tm.cells[y * tm.mapW + x] = cell; }
function reraster() { rasterLayer(S.cur); bus.emit('render'); }
