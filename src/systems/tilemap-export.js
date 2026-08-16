// Bake и экспорт tilemap: запечь слой в пиксели (дублировать/преобразовать),
// экспорт картинки и пары tileset.png + tilemap.json (§14–§15 задачи).
import { S, cloneLayer } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { toast, t } from '../core/dom.js';
import { dirtyAll, markDirty } from '../core/layer-cache.js';
import { makeCanvas } from '../core/canvas.js';
import { gridToCanvas, saveCanvas, saveFile } from '../core/io.js';
import { getTileset } from '../core/tileset.js';
import { isTilemap } from '../core/tilemap.js';
import { buildTilemapJson } from '../logic/tilemap-data.js';

const activeTm = () => { const L = S.layers[S.cur]; return isTilemap(L) ? L : null; };

// дублировать как пиксельный слой (tilemap остаётся редактируемым)
function bakeDuplicate() { const L = activeTm(); if (!L) { toast(t('toast.needTilemapLayer')); return; }
  snapshot(); const copy = cloneLayer(L, { kind: 'pixel', tilemap: undefined, name: L.name });
  S.layers.splice(S.cur + 1, 0, copy); S.cur++; dirtyAll(); bus.emitDoc(); toast(t('toast.tilesBaked')); }

// преобразовать tilemap-слой в обычный пиксельный (связь с тайлами теряется)
export function convertTilemapLayer(index = S.cur) { const L = S.layers[index]; if (!isTilemap(L)) { toast(t('toast.needTilemapLayer')); return false; }
  const ts = getTileset(L.tilemap.tilesetId);
  if (ts) L.tilemapSettings = { ...(L.tilemapSettings || {}), name: ts.name, tileW: ts.tileW, tileH: ts.tileH, tilesetId: ts.id };
  snapshot(); delete L.tilemap; L.kind = 'pixel'; markDirty(index); bus.emitDoc(); toast(t('toast.tilesBaked')); return true; }

// PNG картинки tilemap-слоя (его пиксельная область)
function exportImage() { const L = activeTm(); if (!L) { toast(t('toast.needTilemapLayer')); return; }
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  const w = Math.min(S.W, L.tilemap.mapW * ts.tileW), h = Math.min(S.H, L.tilemap.mapH * ts.tileH);
  saveCanvas(gridToCanvas(L.grid, 0, 0, w, h), (L.name || 'tilemap') + '.png'); }

// tileset.png: все тайлы тайлсета в сетку (cols×rows)
function packTileset(ts) { const n = ts.tiles.length || 1, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  const c = makeCanvas(cols * ts.tileW, rows * ts.tileH), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  ts.tiles.forEach((tile, i) => x.drawImage(gridToCanvas(tile.grid, 0, 0, ts.tileW, ts.tileH), (i % cols) * ts.tileW, Math.floor(i / cols) * ts.tileH));
  return c; }

// tileset.png + tilemap.json для всех tilemap-слоёв активного тайлсета
function exportData() { const L = activeTm(); if (!L) { toast(t('toast.needTilemapLayer')); return; }
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  saveCanvas(packTileset(ts), (ts.name || 'tileset') + '.png');
  const layers = S.layers.filter((x) => isTilemap(x) && x.tilemap.tilesetId === ts.id).map((x) => ({ ...x.tilemap, name: x.name }));
  const json = buildTilemapJson(ts.tileW, ts.tileH, layers);
  saveFile(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), 'tilemap.json', 'application/json', 'tilemap'); }

actions.register('tile.bakeDuplicate', bakeDuplicate);
actions.register('tile.bakeConvert', convertTilemapLayer);
actions.register('tile.exportImage', exportImage);
actions.register('tile.exportData', exportData);
