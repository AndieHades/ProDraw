// Tile Variants: создать вариант активного тайла (в ту же группу, база цела,
// карта не меняется) и Replace With Variants (заменить tileId случайными
// вариантами группы по выделению/всему слою — только по явной команде).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { toast, t } from '../core/dom.js';
import { getTileset, getTile, addTile, tileIndex } from '../core/tileset.js';
import { isTilemap, rasterLayer, inMap } from '../core/tilemap.js';
import { createGroup, pickVariant } from '../core/variant-groups.js';

function activeCtx() { const a = S.activeTile; if (!a) return null;
  const ts = getTileset(a.tilesetId); const tile = ts && getTile(ts, a.tileId); return tile ? { ts, tile } : null; }

// создать вариант: клон активного тайла в его variant-группе (создаём группу,
// если её ещё нет). База не меняется, карта не трогается; открываем редактор.
function createVariant() {
  const c = activeCtx(); if (!c) { toast(t('toast.noTiles')); return; }
  const { ts, tile } = c; snapshot();
  let gid = tile.groupId;
  if (gid == null) { gid = createGroup(ts, tile.name || t('tile.name'), tile.id).id; tile.groupId = gid; }
  const nv = addTile(ts, tile.grid, { name: tile.name, groupId: gid, weight: tile.weight, index: tileIndex(ts, tile.id) + 1 });
  S.activeTile = { tilesetId: ts.id, tileId: nv.id }; // вариант редактируется на холсте (Tile Layer), отдельного окна нет
  bus.emit('tileset-changed'); bus.emit('render');
}

// клетки региона: выделение (если есть на активном слое) или весь слой
function regionCells(tm) { const s = S.tileSel; const out = [];
  if (s && s.li === S.cur) { const x0 = Math.min(s.x0, s.x1), y0 = Math.min(s.y0, s.y1), x1 = Math.max(s.x0, s.x1), y1 = Math.max(s.y0, s.y1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(tm, x, y)) out.push(y * tm.mapW + x); }
  else for (let i = 0; i < tm.cells.length; i++) out.push(i);
  return out;
}

// заменить активный tileId случайными вариантами его группы (взвешенно)
function replaceVariants() {
  const L = S.layers[S.cur]; if (!isTilemap(L)) { toast(t('toast.needTilemapLayer')); return; }
  const c = activeCtx(); if (!c || c.tile.groupId == null) { toast(t('toast.noTiles')); return; }
  const { ts, tile } = c, target = tile.id; snapshot(); let n = 0;
  for (const i of regionCells(L.tilemap)) { const cell = L.tilemap.cells[i]; if (!cell || cell.tileId !== target) continue;
    const id = pickVariant(ts, tile.groupId, Math.random); if (id != null) { cell.tileId = id; n++; } }
  rasterLayer(S.cur); bus.emit('render'); toast(t('toast.tilesReplaced', { n }));
}

actions.register('tile.variant', createVariant);
actions.register('tile.replaceVariants', replaceVariants);
