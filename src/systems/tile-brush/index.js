// Tile Brush: рисует/стирает/берёт тайлы по клеткам tilemap-слоя. Работает
// только на tilemap-слое (иначе подсказка). Режим — S.tileMode (paint/erase/pick),
// трансформация новых экземпляров — S.tileFlags. Случайные варианты — из группы.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { setTool } from '../../core/tools.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { getTileset, getTile } from '../../core/tileset.js';
import { isTilemap, getCell, setCell, inMap, stampTileId, stampTileSource, rollRandomTile } from '../../core/tilemap.js';
import { pickVariant } from '../../core/variant-groups.js';
import { cellFlags } from '../../logic/tile-transform.js';

// экранную клетку сетки (gx,gy) перевести в клетку карты текущего слоя
function toCell(gx, gy) { const L = S.layers[S.cur]; if (!isTilemap(L)) return null;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  return inMap(L.tilemap, cx, cy) ? { cx, cy, ts } : null; }

function paintAt(cx, cy, ts) {
  const src = stampTileSource(ts.id);
  // активная variant-группа без паттерна/рандома — случайный вариант группы
  let id = (src && src.groupId != null && !S.tilePattern && !S.tileRandom)
    ? pickVariant(ts, src.groupId, Math.random) : stampTileId(cx, cy, ts.id);
  if (id == null || !getTile(ts, id)) { if (!S.tilePattern) toast(t('toast.noTiles')); return; }
  setCell(S.cur, cx, cy, { tileId: id, ...S.tileFlags });
  if (S.tileRandom && S.tileMarks.size) rollRandomTile(); // следующий штамп — новый случайный (и превью обновится)
}

function pickAt(cx, cy) {
  const L = S.layers[S.cur];
  S.tileSel = { li: S.cur, x0: cx, y0: cy, x1: cx, y1: cy }; // выбор клетки (draw выключен)
  const cell = getCell(L.tilemap, cx, cy);
  if (cell && cell.tileId != null) { S.activeTile = S.placeTile = { tilesetId: L.tilemap.tilesetId, tileId: cell.tileId }; S.tileFlags = cellFlags(cell); }
  bus.emit('tileset-changed'); bus.emit('render');
}

function act(cx, cy, ts) {
  if (S.tileMode === 'pick') pickAt(cx, cy);
  else if (S.tileMode === 'erase') setCell(S.cur, cx, cy, null);
  else paintAt(cx, cy, ts);
}

let last = null;
const brush = {
  down({ gx, gy }) { const c = toCell(gx, gy);
    if (!c) { if (!isTilemap(S.layers[S.cur])) toast(t('toast.needTilemapLayer')); return; }
    if (S.tileMode !== 'pick') snapshot();
    act(c.cx, c.cy, c.ts); last = c.cx + ',' + c.cy; bus.emit('render'); },
  move({ gx, gy }) { if (S.tileMode === 'pick') return; const c = toCell(gx, gy); if (!c) return;
    const k = c.cx + ',' + c.cy; if (k === last) return; last = k; act(c.cx, c.cy, c.ts); bus.emit('render'); },
  up() { last = null; },
};

registerTool('tilebrush', brush);
actions.register('tool.tilebrush', () => setTool('tilebrush'));
actions.register('tile.mode.paint', () => { S.tileMode = 'paint'; bus.emit('tileset-changed'); });
actions.register('tile.mode.erase', () => { S.tileMode = 'erase'; bus.emit('tileset-changed'); });
actions.register('tile.mode.pick', () => { S.tileMode = 'pick'; bus.emit('tileset-changed'); });
actions.register('tile.random', () => { S.tileRandom = !S.tileRandom; bus.emit('tileset-changed'); });

// transform-флаги новых экземпляров — сразу видно на превью кисти (render)
const ef = () => { bus.emit('tileset-changed'); bus.emit('render'); };
actions.register('tile.flipH', () => { S.tileFlags.flipX = !S.tileFlags.flipX; ef(); });
actions.register('tile.flipV', () => { S.tileFlags.flipY = !S.tileFlags.flipY; ef(); });
actions.register('tile.diagonal', () => { S.tileFlags.diagonalFlip = !S.tileFlags.diagonalFlip; ef(); });
actions.register('tile.rotate', () => { S.tileFlags.rotation = (S.tileFlags.rotation + 90) % 360; ef(); });
actions.register('tile.resetFlags', () => { S.tileFlags = { flipX: false, flipY: false, diagonalFlip: false, rotation: 0 }; ef(); });
