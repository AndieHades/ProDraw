// Создание Tile-слоя. Размер тайла = квадрат Tileset Grid (S.tileGrid.size),
// отдельно от обычной сетки Grid. Выбор Tile-слоя подстраивает Tileset Grid
// под размер его тайлов.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { toast, t } from '../core/dom.js';
import { dirtyAll } from '../core/layer-cache.js';
import { createTileset } from '../core/tileset.js';
import { canvasSizeForTiles, expandCanvas } from '../core/document.js';
import { makeTilemapLayer, rasterLayer, isTilemap } from '../core/tilemap.js';
import { TILE_GRID_SIZES } from '../config/tileset.js';
import { openTilemapDialog } from './tilemap-dialog.js';

// подстроить Tileset Grid под размер тайлов активного Tile-слоя
export function syncGridToTilemap() {
  const L = S.layers[S.cur]; if (!isTilemap(L)) return;
  const ts = S.tilesets.find((x) => x.id === L.tilemap.tilesetId); if (!ts) return;
  if (TILE_GRID_SIZES.includes(ts.tileW)) { S.tileGrid.size = ts.tileW; bus.emit('tileset-changed'); }
  bus.emit('render');
}

const fallbackSize = () => Math.max(1, Math.round(S.tileGrid.size || 16));
const dialogDefaults = () => ({ tileW: fallbackSize(), tileH: fallbackSize() });
export function resizeCanvasForTiles(tw, th) {
  const { w: nw, h: nh } = canvasSizeForTiles(tw, th);
  if (nw > S.W || nh > S.H) expandCanvas(0, 0, nw - S.W, nh - S.H);
}

export function createTilemap(opts = {}) {
  snapshot();
  const tw = Math.max(1, Math.round(opts.tileW || fallbackSize()));
  const th = Math.max(1, Math.round(opts.tileH || opts.tileW || fallbackSize()));
  if (opts.resizeCanvas) resizeCanvasForTiles(tw, th);
  const ts = createTileset(opts.name || t('tilemap.newTileset'), tw, th);
  const mapW = Math.max(1, Math.ceil(S.W / tw)), mapH = Math.max(1, Math.ceil(S.H / th));
  const L = makeTilemapLayer(t('tile.tilemapLayer'), ts.id, mapW, mapH);
  const at = S.layers.length; S.layers.splice(at, 0, L); S.cur = at;
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxCur = null;
  S.activeTile = S.placeTile = { tilesetId: ts.id, tileId: ts.tiles[0] ? ts.tiles[0].id : null };
  if (tw === th && TILE_GRID_SIZES.includes(tw)) S.tileGrid.size = tw;
  rasterLayer(at); dirtyAll(); bus.emit('render'); bus.emitDoc(); bus.emit('tileset-changed'); toast(t('toast.tilemapCreated'));
}

export function open() {
  openTilemapDialog({ ...dialogDefaults(), title: t('tile.newLayer'), onSubmit: createTilemap });
}

export function mount() {
  actions.register('tilemap.newLayer', open);
  actions.register('tilemap.syncGrid', syncGridToTilemap);
  bus.on('layers', syncGridToTilemap); // выбор Tile-слоя подстраивает Tileset Grid
}
