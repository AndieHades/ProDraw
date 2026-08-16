// Tilemap workspace: когда активен Tilemap-слой, автоматически показывает
// панель тайлсета, сетку клеток и контекстные операции по клетке.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { showMenuAt, toast, t } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { gridAt } from '../../core/viewport.js';
import { registerGlobal } from '../../core/canvas-handlers.js';
import { isTilemap, getCell, inMap } from '../../core/tilemap.js';
import { cellFlags } from '../../logic/tile-transform.js';
import { ctxTileSize, cellEmptyAt, addToSet, cellFlipH, cellFlipV, cellRotate, cellClear, cellFill, cellSelect } from './cell-ops.js';

let menu = null, mounted = false;

// Во время работы с клетками стабилизация выключается; при уходе с Tilemap-слоя
// возвращаем прежнее состояние.
function suspendBrush() { if (S.tilesetPrev) return; S.tilesetPrev = { stab: S.stabOn }; S.stabOn = false; bus.emit('brush-flags'); }
function restoreBrush() { if (!S.tilesetPrev) return; S.stabOn = S.tilesetPrev.stab; S.tilesetPrev = null; bus.emit('brush-flags'); }
const activeIsTilemap = () => !S.bgSel && S.selFolder == null && !S.fxCur && isTilemap(S.layers[S.cur]);

export function setMode(on) {
  S.tileset ||= { on: false, open: false };
  S.tileset.on = !!on; // Tileset Grid — собственный оверлей, обычную сетку Grid не трогаем
  if (on) { suspendBrush(); actions.run('tile.palette.open'); if (activeIsTilemap()) actions.run('tilemap.syncGrid'); }
  else {
    restoreBrush(); actions.run('tile.palette.close'); S.tileSel = null; if (menu) menu.classList.remove('on');
    if (S.tool === 'tilebrush' || S.tool === 'tileselect') setTool('pencil');
  }
  bus.emit('tileset-changed'); bus.emit('render');
}

export const syncForActiveLayer = () => setMode(activeIsTilemap());

// клетка под точкой — только по Tileset Grid и границам холста, без привязки к
// типу слоя (Tile Layer не нужен; ПКМ-меню работает на любом слое)
function cellFromGrid(gx, gy) { if (!S.layers[S.cur]) return null; const { w, h } = ctxTileSize();
  if (gx < 0 || gy < 0 || gx >= S.W || gy >= S.H) return null;
  return { cx: Math.floor(gx / w), cy: Math.floor(gy / h) }; }

// выбрать клетку (+ снять тайл активным, если это Tilemap-слой)
function selectCell(cx, cy) { S.tileSel = { li: S.cur, x0: cx, y0: cy, x1: cx, y1: cy };
  const L = S.layers[S.cur]; if (isTilemap(L)) { const cell = getCell(L.tilemap, cx, cy);
    if (cell && cell.tileId != null) { S.activeTile = { tilesetId: L.tilemap.tilesetId, tileId: cell.tileId }; S.tileFlags = cellFlags(cell); bus.emit('tileset-changed'); } }
  bus.emit('render'); }

const item = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { menu.classList.remove('on'); fn(); }; return b; };
function openCellMenu(px, py) {
  if (!menu) { menu = document.createElement('div'); menu.id = 'tile-cctx'; menu.className = 'menu'; document.body.appendChild(menu); }
  menu.innerHTML = '';
  // на Tile-слое Add tile не нужен (тайл уже в палитре или попадёт туда автоматически)
  if (!isTilemap(S.layers[S.cur])) menu.append(item(t('tile.addToSet'), addToSet));
  menu.append(item(t('tile.flipH'), cellFlipH), item(t('tile.flipV'), cellFlipV));
  if (isTilemap(S.layers[S.cur])) menu.append(item(t('tile.rot90'), cellRotate));
  menu.append(item(t('tile.select'), cellSelect), item(t('tile.fill'), cellFill), item(t('tile.clearCell'), cellClear));
  showMenuAt(menu, px, py);
}

// ПКМ по Tilemap-клетке открывает меню даже на пустом месте: Clear cell должен
// удалять только экземпляр на карте, не трогая тайл в палитре.
function interactCell(cx, cy, px, py) {
  const L = S.layers[S.cur];
  if (isTilemap(L)) { if (!inMap(L.tilemap, cx, cy)) return; selectCell(cx, cy); openCellMenu(px, py); return; }
  if (cellEmptyAt(cx, cy)) { toast(t('toast.cellEmpty')); return; }
  selectCell(cx, cy); openCellMenu(px, py);
}

// режим клеток активен, кроме Place tile — там ЛКМ ставит тайл
const cellActive = () => !!(S.tileset && S.tileset.on) && !(S.tool === 'tilebrush' && S.tileMode === 'paint');

let pend = null;
const cellHandler = {
  down({ gx, gy, e }) { if (!cellActive()) return false;
    // Tile-слой: ЛКМ рисует (штамп/M/A), меню — только на ПКМ; обработчик не вмешивается
    if (isTilemap(S.layers[S.cur])) return false;
    const c = cellFromGrid(gx, gy); if (!c) return false;
    if (cellEmptyAt(c.cx, c.cy)) return true; // обычный слой, пусто: кисть выключена, клик «съедается»
    pend = { cx: c.cx, cy: c.cy, x: e.clientX, y: e.clientY }; return true; },
  up() { if (!pend) return; const p = pend; pend = null; selectCell(p.cx, p.cy); openCellMenu(p.x, p.y); },
};
registerGlobal(cellHandler);

function onCanvasMenu(e) {
  const [gx, gy] = gridAt(e.clientX, e.clientY); const c = cellFromGrid(gx, gy); if (!c) return false;
  if (!activeIsTilemap() && (!S.tileset || !S.tileset.on)) return false;
  interactCell(c.cx, c.cy, e.clientX, e.clientY); return true; }

export function mount() {
  if (mounted) { syncForActiveLayer(); return; }
  mounted = true;
  actions.register('tile.cell.flipH', cellFlipH); actions.register('tile.cell.flipV', cellFlipV); actions.register('tile.cell.rotate', cellRotate); actions.register('tile.cell.clear', cellClear);
  actions.register('tile.addToSet', addToSet);
  bus.on('canvas-menu', onCanvasMenu);
  bus.on('layer-active', syncForActiveLayer);
  bus.on('layers', syncForActiveLayer);
  syncForActiveLayer();
}
export { addToSet, cellFlipH, cellFlipV, cellRotate };
