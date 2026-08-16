// Команды Tile Palette над тайлами активного тайлсета: создать/дублировать/
// удалить/переименовать. Снимок в историю + чистка экземпляров удалённого тайла.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { addTileUnique, duplicateTile, deleteTile, renameTile, tileIndex } from '../../core/tileset.js';
import { isTilemap, rasterLayer, layersUsingTile } from '../../core/tilemap.js';
import { createTileVariantCell } from '../../core/tile-variant.js';
import { confirmDialog } from '../../core/confirm.js';

// активный тайлсет для палитры. Палитра — как набор кистей, НЕ зависит от слоёв:
// активный Tile-слой → его тайлсет; иначе тайлсет активного тайла (не теряем
// палитру при удалении/смене слоя); иначе первый в библиотеке.
export function activeTileset() {
  const L = S.layers[S.cur];
  if (isTilemap(L)) { const ts = S.tilesets.find((x) => x.id === L.tilemap.tilesetId); if (ts) return ts; }
  if (S.activeTile) { const ts = S.tilesets.find((x) => x.id === S.activeTile.tilesetId); if (ts) return ts; }
  return S.tilesets[0] || null;
}

const changed = () => { bus.emit('tileset-changed'); bus.emit('render'); };
const liveIds = (ts) => new Set((ts?.tiles || []).map((tile) => tile.id));

export function newTile() { const ts = activeTileset(); if (!ts) { toast(t('toast.noTilemap')); return; }
  snapshot(); const { tile } = addTileUnique(ts); S.activeTile = S.placeTile = { tilesetId: ts.id, tileId: tile.id }; changed(); }

export function dupTile(tileId) { const ts = activeTileset(); if (!ts) return;
  snapshot(); const tl = duplicateTile(ts, tileId); if (tl) S.activeTile = S.placeTile = { tilesetId: ts.id, tileId: tl.id }; changed(); }

export function transformTile(tileId, op) { const ts = activeTileset(); if (!ts) return null;
  snapshot();
  const res = createTileVariantCell(ts, { tileId }, op); if (!res) return null;
  S.activeTile = S.placeTile = { tilesetId: ts.id, tileId: res.tile.id };
  S.tileMarks = new Set([res.tile.id]); S.tilePattern = null; S.tileRandomNext = null;
  changed(); toast(t(res.added ? 'toast.tileAdded' : 'toast.tileExists'));
  return res.tile; }

// удалить тайл из тайлсета и очистить ВСЕ его экземпляры на холсте (без UI-подтв.)
export function removeTiles(ts, tileIds) { const live = liveIds(ts), ids = [...new Set(tileIds)].filter((id) => live.has(id));
  if (!ids.length) return;
  const del = new Set(ids); let touchedLayers = false;
  snapshot();
  ids.forEach((id) => deleteTile(ts, id));
  S.layers.forEach((L, i) => { if (!isTilemap(L) || L.tilemap.tilesetId !== ts.id) return;
    let touched = false;
    L.tilemap.cells = L.tilemap.cells.map((c) => { if (c && del.has(c.tileId)) { touched = true; return null; } return c; });
    if (touched) { touchedLayers = true; rasterLayer(i); } });
  const fallback = ts.tiles[0] ? { tilesetId: ts.id, tileId: ts.tiles[0].id } : null;
  if (S.activeTile && S.activeTile.tilesetId === ts.id && del.has(S.activeTile.tileId)) S.activeTile = fallback;
  if (S.placeTile && S.placeTile.tilesetId === ts.id && del.has(S.placeTile.tileId)) S.placeTile = fallback;
  if (del.has(S.tileRandomNext)) S.tileRandomNext = null;
  const liveNow = liveIds(ts);
  S.tileMarks = new Set([...S.tileMarks].filter((id) => liveNow.has(id) && !del.has(id)));
  if (S.tileMarks.size < 2) S.tilePattern = null;
  changed(); if (touchedLayers) bus.emit('layers'); }

export function removeTile(ts, tileId) { removeTiles(ts, [tileId]); }

// Delete Tile: глобально удаляет тайл; если он есть на холсте — спросить подтверждение
function deleteTargets(ts, tileId = null) {
  const live = liveIds(ts), marks = [...S.tileMarks].filter((id) => live.has(id));
  if (tileId != null && live.has(tileId)) return S.tileMarks.has(tileId) && marks.length ? marks : [tileId];
  if (marks.length) return marks;
  return (S.activeTile && S.activeTile.tilesetId === ts.id && live.has(S.activeTile.tileId)) ? [S.activeTile.tileId] : [];
}
export async function delTile(tileId = null) { const ts = activeTileset(); if (!ts) return;
  const ids = deleteTargets(ts, tileId); if (!ids.length) return;
  if (ids.some((id) => layersUsingTile(ts.id, id).length) && !(await confirmDialog(t('tile.deleteConfirm')))) return;
  removeTiles(ts, ids); }

export function renTile(tileId, name) { const ts = activeTileset(); if (!ts) return; snapshot(); renameTile(ts, tileId, name); changed(); }

// видимый индекс тайла в палитре (для подписи)
export const visibleIndex = (ts, tileId) => tileIndex(ts, tileId);
