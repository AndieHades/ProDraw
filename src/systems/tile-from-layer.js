// Create Tile From Layer: режет активный пиксельный слой на тайлы размера сетки
// и добавляет непустые в тайлсет (панель тайлов). Кнопка в панели слоёв.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { $, toast, t } from '../core/dom.js';
import { addTileUnique, createTileset, getTileset } from '../core/tileset.js';
import { isTilemap, gridTileSize, tilesetForSize, rasterLayer } from '../core/tilemap.js';
import { rasterizeTextLayer } from '../core/text-layer.js';
import { dirtyAll } from '../core/layer-cache.js';
import { blank } from '../logic/raster.js';
import { localeValues } from '../i18n/index.js';
import { TILE_GRID_SIZES } from '../config/tileset.js';
import { openTilemapDialog } from './tilemap-dialog.js';
import { resizeCanvasForTiles } from './tilemap-create.js';

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function isDefaultLayerName(name) {
  const bases = localeValues('layer.name').map(escRe), re = new RegExp('^(?:' + bases.join('|') + ')\\s+\\d+$');
  return re.test((name || '').trim());
}

// вырезать блок tw×th из сетки слоя по клетке (cx,cy); null — если блок пуст
function block(grid, cx, cy, tw, th) {
  const g = blank(tw, th); let any = false;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const sy = cy * th + y, sx = cx * tw + x;
    if (sy < S.H && sx < S.W) { const c = grid[sy][sx]; if (c) { g[y][x] = c.slice(); any = true; } }
  }
  return any ? g : null;
}

export function fromLayer() {
  const L = S.layers[S.cur];
  if (!L || isTilemap(L)) { toast(t('toast.needPixelLayer')); return; }
  const { w: tw, h: th } = gridTileSize();
  const ts = tilesetForSize(tw, th);
  snapshot(); rasterizeTextLayer(L, S.W, S.H); let added = 0, lastId = null;
  for (let cy = 0; cy * th < S.H; cy++) for (let cx = 0; cx * tw < S.W; cx++) {
    const g = block(L.grid, cx, cy, tw, th); if (!g) continue;
    const r = addTileUnique(ts, g); lastId = r.tile.id; if (r.added) added++; // одинаковые тайлы не дублируются
  }
  if (lastId == null) { toast(t('toast.layerEmpty')); return; }
  S.activeTile = { tilesetId: ts.id, tileId: lastId };
  actions.run('tile.palette.open'); bus.emit('tileset-changed'); bus.emit('render');
  toast(t('toast.tilesFromLayer', { n: added }));
}

const fallbackName = () => t('tilemap.newTileset');
const savedTilemapSettings = (L) => (L && L.tilemapSettings ? { ...L.tilemapSettings } : null);
const currentTilemapSettings = (L) => {
  if (!isTilemap(L)) return savedTilemapSettings(L);
  const ts = getTileset(L.tilemap.tilesetId);
  return {
    ...(L.tilemapSettings || {}),
    name: L.tilemapSettings?.name || ts?.name || fallbackName(),
    tileW: ts?.tileW || L.tilemapSettings?.tileW || gridTileSize().w,
    tileH: ts?.tileH || L.tilemapSettings?.tileH || gridTileSize().h,
    tilesetId: ts?.id || L.tilemapSettings?.tilesetId,
  };
};
const convertDims = (opts) => {
  const g = gridTileSize();
  return {
    tw: Math.max(1, Math.round(opts.tileW || g.w)),
    th: Math.max(1, Math.round(opts.tileH || opts.tileW || g.h)),
  };
};
const convertTileset = (opts, tw, th) => {
  const stored = opts.tilesetId ? getTileset(opts.tilesetId) : null;
  if (stored && stored.tileW === tw && stored.tileH === th) { if (opts.name) stored.name = opts.name; return stored; }
  return opts.newTileset ? createTileset(opts.name || fallbackName(), tw, th) : tilesetForSize(tw, th);
};

// Convert to Tilemap: превратить активный пиксельный слой в Tilemap-слой. Режем по
// сетке с дедупликацией (одинаковые блоки → один tileId), клетки ссылаются на
// тайлы. Слой меняет тип на 'tilemap' и получает иконку в списке.
export function convertToTile(opts = {}) {
  const idx = opts.index ?? S.cur, L = S.layers[idx];
  if (!L || isTilemap(L)) { toast(t('toast.needPixelLayer')); return; }
  const { tw, th } = convertDims(opts);
  const ts = convertTileset(opts, tw, th);
  if (opts.snapshot !== false) snapshot();
  if (opts.resizeCanvas) resizeCanvasForTiles(tw, th);
  rasterizeTextLayer(L, S.W, S.H);
  const mapW = Math.ceil(S.W / tw), mapH = Math.ceil(S.H / th), cells = new Array(mapW * mapH).fill(null);
  for (let cy = 0; cy < mapH; cy++) for (let cx = 0; cx < mapW; cx++) {
    const g = block(L.grid, cx, cy, tw, th); if (!g) continue;
    const id = addTileUnique(ts, g).tile.id; // дедуп: одинаковые блоки → один tileId
    cells[cy * mapW + cx] = { tileId: id, flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };
  }
  if (isDefaultLayerName(L.name)) L.name = t('tile.tilemapLayer');
  L.kind = 'tilemap'; L.tilemap = { tilesetId: ts.id, mapW, mapH, cells };
  L.tilemapSettings = { name: ts.name, tileW: tw, tileH: th, resizeCanvas: !!opts.resizeCanvas, tilesetId: ts.id };
  S.activeTile = { tilesetId: ts.id, tileId: ts.tiles[0] ? ts.tiles[0].id : null };
  if (tw === th && TILE_GRID_SIZES.includes(tw)) S.tileGrid.size = tw;
  rasterLayer(idx); dirtyAll();
  actions.run('tile.palette.open'); bus.emit('tileset-changed'); bus.emitDoc();
  toast(t('toast.tilesFromLayer', { n: ts.tiles.length }));
}

export function openConvertDialog(opts = {}) {
  const L = S.layers[S.cur], saved = savedTilemapSettings(L);
  if (!L || isTilemap(L)) { toast(t('toast.needPixelLayer')); return; }
  const { w, h } = gridTileSize();
  openTilemapDialog({
    title: t('menu.convertTile'),
    name: saved?.name,
    tileW: opts.tileW || saved?.tileW || w,
    tileH: opts.tileH || saved?.tileH || h,
    resizeCanvas: opts.resizeCanvas ?? saved?.resizeCanvas,
    gridPreview: true,
    onSubmit: (entry) => convertToTile({ ...saved, ...entry, newTileset: true }),
  });
}

export function openTilemapSettings() {
  const L = S.layers[S.cur]; if (!isTilemap(L)) { toast(t('toast.needTilemapLayer')); return; }
  const settings = currentTilemapSettings(L);
  openTilemapDialog({
    title: t('tilemap.settings'),
    name: settings.name,
    tileW: settings.tileW,
    tileH: settings.tileH,
    resizeCanvas: settings.resizeCanvas,
    gridPreview: true,
    onSubmit: (entry) => {
      const idx = S.cur, layer = S.layers[idx]; if (!isTilemap(layer)) return;
      rasterLayer(idx); snapshot();
      layer.kind = 'pixel'; delete layer.tilemap;
      convertToTile({ ...settings, ...entry, index: idx, snapshot: false, newTileset: true });
    },
  });
}

export function toggleActiveTilemapLayer() {
  const L = !S.bgSel && S.selFolder == null && !S.fxCur ? S.layers[S.cur] : null;
  if (!L) { toast(t('toast.needPixelLayer')); return; }
  if (isTilemap(L)) { actions.run('tile.bakeConvert', S.cur); return; }
  const saved = savedTilemapSettings(L);
  if (saved) convertToTile({ ...saved, newTileset: true });
  else openConvertDialog();
}

export function mount() {
  actions.register('tile.fromLayer', fromLayer); // действие осталось для внутренних сценариев; UI-конвертация идёт через кнопку lay-tmap
  actions.register('tile.convertLayer', openConvertDialog);
  actions.register('tilemap.settings', openTilemapSettings);
  actions.register('tilemap.toggleLayer', toggleActiveTilemapLayer);
  const btn = $('lay-tmap'); if (btn) btn.onclick = toggleActiveTilemapLayer;
}
