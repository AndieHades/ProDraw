// Операции над слоями: добавить, слить отмеченные/диапазон, сгруппировать, дублировать.
import { S, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, snapshotRasterReferences,
  snapshotStructure } from '../../core/history.js';
import { cloneGrid, symmetrizeGrid } from '../../logic/raster.js';
import { dirtyAll, layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { bakeFolder, bakeLayerIndices } from '../../core/layer-bake.js';
import { isTilemap, rasterLayer, composeCell } from '../../core/tilemap.js';
import { getTileset, addTileUnique } from '../../core/tileset.js';
import { createGroup } from '../../core/variant-groups.js';
import { toast, t } from '../../core/dom.js';
import { effVis, folderChain } from '../../core/layers.js';
import { clearFolderEmptyPos, selectedIdx } from './helpers.js';
import { deleteLayer, deleteFolder, deleteLayerRef } from './structure-delete.js';
import { doAddLayer, doGroup, duplicateFolder, duplicateLayer,
  ungroupFolder } from './structure-ops.js';
import { clearReferenceTargets } from './reference-pixels.js';

const gridHasPixels = (g) => g.some((row) => row.some((c) => c && (c[3] ?? 255) > 0));
const visibleFx = (L) => (L.effects || []).some((e) => e.visible !== false);
const mergeKeepsTilemap = (idx, meta) => {
  const top = S.layers[meta]; if (!isTilemap(top)) return null;
  const topTs = getTileset(top.tilemap.tilesetId); if (!topTs) return null;
  for (const i of idx) { const L = S.layers[i]; if (L.clip || L.opacity !== 1 || visibleFx(L)) return null;
    if (!isTilemap(L)) continue;
    const ts = getTileset(L.tilemap.tilesetId); if (!ts || ts.tileW !== topTs.tileW || ts.tileH !== topTs.tileH) return null; }
  return topTs;
};

function copyTilePalettesIntoTarget(idx, targetTs) {
  for (const i of idx) {
    const L = S.layers[i]; if (!isTilemap(L)) continue;
    const srcTs = getTileset(L.tilemap.tilesetId); if (!srcTs || srcTs === targetTs) continue;
    const groupMap = new Map(), tileMap = new Map();
    for (const g of (srcTs.groups || [])) groupMap.set(g.id, createGroup(targetTs, g.name, null).id);
    for (const tile of srcTs.tiles) {
      const groupId = tile.groupId == null ? null : groupMap.get(tile.groupId) ?? null;
      const res = addTileUnique(targetTs, tile.grid, { name: tile.name, groupId, weight: tile.weight });
      tileMap.set(tile.id, res.tile.id);
    }
    for (const g of (srcTs.groups || [])) {
      const ng = (targetTs.groups || []).find((x) => x.id === groupMap.get(g.id));
      if (ng) ng.baseTileId = tileMap.get(g.baseTileId) ?? null;
    }
    targetTs.groups = (targetTs.groups || []).filter((g) => targetTs.tiles.some((tile) => tile.groupId === g.id));
  }
}

function mergeTilemapIndices(idx, meta) {
  const ts = mergeKeepsTilemap(idx, meta); if (!ts) return false;
  snapshot();
  const src = S.layers[meta], contrib = idx.filter((i) => effVis(i));
  copyTilePalettesIntoTarget(idx, ts);
  const mapW = Math.max(Math.ceil(S.W / ts.tileW), ...idx.map((i) => S.layers[i].tilemap?.mapW || 0));
  const mapH = Math.max(Math.ceil(S.H / ts.tileH), ...idx.map((i) => S.layers[i].tilemap?.mapH || 0));
  const cells = new Array(mapW * mapH).fill(null);
  for (let cy = 0; cy < mapH; cy++) for (let cx = 0; cx < mapW; cx++) {
    const g = composeCell(contrib, cx, cy, ts.tileW, ts.tileH); if (!gridHasPixels(g)) continue;
    const tile = addTileUnique(ts, g).tile;
    cells[cy * mapW + cx] = { tileId: tile.id, flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };
  }
  const merged = { name: src.name, grid: blank(S.W, S.H), opacity: 1, visible: true, fid: src.fid, clip: false,
    lock: false, alphaLock: false, reference: idx.some((i) => S.layers[i].reference), ext: new Map(), effects: [],
    kind: 'tilemap', tilemap: { tilesetId: ts.id, mapW, mapH, cells } };
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  const at = meta - idx.length + 1;
  S.layers.splice(at, 0, merged); rasterLayer(at); clearFolderEmptyPos(merged.fid);
  S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emitDoc(); toast(t('toast.layersMerged')); return true;
}

function mergeIndices(idx) { idx = [...new Set(idx)].filter((i) => S.layers[i]).sort((a, b) => a - b); if (idx.length < 2) return;
  const meta = idx[idx.length - 1]; if (mergeTilemapIndices(idx, meta)) return;
  const out = bakeLayerIndices(idx), ext = new Map();
  snapshotStructure();
  const merged = { name: S.layers[meta].name, grid: out, opacity: 1, visible: true, fid: S.layers[meta].fid, clip: false, lock: false, alphaLock: false, reference: idx.some((i) => S.layers[i].reference), ext, effects: [] };
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  const at = meta - idx.length + 1;
  S.layers.splice(at, 0, merged); clearFolderEmptyPos(merged.fid);
  S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll({ preserveGridBounds: true }); bus.emitDoc(); toast(t('toast.layersMerged')); }

function selectedFolder() { const id = S.selFolder ?? (S.markedFolders.size === 1 ? [...S.markedFolders][0] : null);
  return id == null ? null : S.folders.find((f) => f.id === id); }

function mergeFolder(f) { const baked = bakeFolder(f); if (baked.idx.length < 1) return;
  snapshotStructure(); const at = Math.min(...baked.idx), parent = f.parent ?? null;
  const merged = { name: f.name, grid: baked.grid, opacity: 1, visible: true, fid: parent, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] };
  for (let j = baked.idx.length - 1; j >= 0; j--) S.layers.splice(baked.idx[j], 1);
  S.folders = S.folders.filter((sf) => !folderChain(sf.id).some((x) => x.id === f.id));
  S.layers.splice(at, 0, merged); S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll({ preserveGridBounds: true }); bus.emitDoc(); toast(t('toast.layersMerged')); }

export function doMerge() { const f = selectedFolder(); if (f) { mergeFolder(f); return; } let idx = selectedIdx();
  if (idx.length < 2) { if (S.cur > 0) idx = [S.cur - 1, S.cur]; else { toast(t('toast.markLayers')); return; } }
  mergeIndices(idx); }

// слить диапазон слоёв [a..b] (щипок), независимо от выбора
export function mergeRange(a, b) { const idx = []; for (let i = Math.min(a, b); i <= Math.max(a, b); i++) idx.push(i); mergeIndices(idx); }

export function symmetrizeLayerRefs(layers) { const ts = layers.filter((L) => S.layers.includes(L)); if (!ts.length) return;
  const indices = ts.map((layer) => S.layers.indexOf(layer));
  if (!snapshotRasterReferences(indices)) snapshot();
  const v = S.sym || (!S.sym && !S.symH), h = S.symH;
  for (const L of ts) { const grid = cloneGrid(L.grid); symmetrizeGrid(grid, v, h);
    L.grid = grid; markDirty(S.layers.indexOf(L)); }
  bus.emitDoc(); }

// Stable re-export for swipe/menu callers; implementation owns metadata history.
export { toggleLock, toggleAlphaLock, toggleClip, toggleReference } from './metadata.js';
const layerHasContent = (L) => { const index = S.layers.indexOf(L);
  return (index >= 0 ? !!layerContentBounds(index) : gridHasPixels(L.grid)) ||
    !!L.ext.size || (isTilemap(L) && L.tilemap.cells.some(Boolean)); };
export function clearLayerContent(L) {
  const idx = S.layers.indexOf(L); if (idx < 0 || !layerHasContent(L)) return false;
  if (isTilemap(L)) { L.tilemap.cells = new Array(L.tilemap.mapW * L.tilemap.mapH).fill(null); rasterLayer(idx); }
  else { L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(idx); }
  return true;
}
export function clearLayerRefs(layers) {
  const targets = layers.filter((layer) => S.layers.includes(layer));
  if (!targets.length) return false;
  if (!targets.some(layerHasContent)) return false;
  const referenced = clearReferenceTargets(targets);
  if (referenced !== null) { bus.emitDoc(); return referenced; }
  snapshot(); let changed = false;
  for (const layer of targets) changed = clearLayerContent(layer) || changed;
  if (changed) bus.emitDoc(); return changed;
}
export function clearLayerRef(L) {
  if (clearLayerRefs([L])) toast(t('toast.layerCleared'));
}

actions.register('layer.add', doAddLayer);
actions.register('layer.merge', doMerge);
actions.register('layer.group', doGroup);
actions.register('layer.delete', deleteLayer); // удалить активную строку (слой/папка/эффект/настройка) — корзина и Delete

export { deleteFolder, deleteLayer, deleteLayerRef, doAddLayer, doGroup,
  duplicateFolder, duplicateLayer, ungroupFolder };
