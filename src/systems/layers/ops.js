// Операции над слоями: добавить, слить отмеченные/диапазон, сгруппировать, дублировать.
import { S, newLayer, cloneFx, cloneLayer, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { symmetrizeGrid } from '../../logic/raster.js';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { bakeFolder, bakeLayerIndices } from '../../core/layer-bake.js';
import { isTilemap, rasterLayer, composeCell } from '../../core/tilemap.js';
import { getTileset, addTileUnique } from '../../core/tileset.js';
import { createGroup } from '../../core/variant-groups.js';
import { toast, t } from '../../core/dom.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { effVis, folderChain } from '../../core/layers.js';
import { localeValues } from '../../i18n/index.js';
import { folderLayers, topOfFolder, selectedIdx, nextFolderId, uniqueFolderName, nextFolderName, clearFolderEmptyPos, rememberEmptyFolderPositions } from './helpers.js';

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function nextLayerName() {
  const bases = localeValues('layer.name').map(escRe), re = new RegExp('^(?:' + bases.join('|') + ')\\s+(\\d+)$');
  let max = 0;
  for (const L of S.layers) { const m = (L.name || '').trim().match(re); if (m) max = Math.max(max, +m[1]); }
  S.layerSeq = max + 1; return t('layer.name') + ' ' + S.layerSeq;
}

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

export function doAddLayer() { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshot(); const cur = S.layers[S.cur], chain = cur ? folderChain(cur.fid) : [];
  const inOpenFolder = !S.selFolder && cur && cur.fid != null && chain.every((f) => f.open);
  const nl = newLayer(nextLayerName(), S.W, S.H); nl.fid = inOpenFolder ? cur.fid : null;
  const at = inOpenFolder ? S.cur + 1 : S.layers.length;
  S.layers.splice(at, 0, nl); clearFolderEmptyPos(nl.fid);
  S.cur = at; S.selFolder = null; S.bgSel = false; S.marked.clear(); S.markedFolders.clear(); S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emitDoc(); }

function mergeIndices(idx) { idx = [...new Set(idx)].filter((i) => S.layers[i]).sort((a, b) => a - b); if (idx.length < 2) return;
  const meta = idx[idx.length - 1]; if (mergeTilemapIndices(idx, meta)) return;
  snapshot();
  const out = bakeLayerIndices(idx), ext = new Map();
  const merged = { name: S.layers[meta].name, grid: out, opacity: 1, visible: true, fid: S.layers[meta].fid, clip: false, lock: false, alphaLock: false, reference: idx.some((i) => S.layers[i].reference), ext, effects: [] };
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  const at = meta - idx.length + 1;
  S.layers.splice(at, 0, merged); clearFolderEmptyPos(merged.fid);
  S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emitDoc(); toast(t('toast.layersMerged')); }

function selectedFolder() { const id = S.selFolder ?? (S.markedFolders.size === 1 ? [...S.markedFolders][0] : null);
  return id == null ? null : S.folders.find((f) => f.id === id); }

function mergeFolder(f) { const baked = bakeFolder(f); if (baked.idx.length < 1) return;
  snapshot(); const at = Math.min(...baked.idx), parent = f.parent ?? null;
  const merged = { name: f.name, grid: baked.grid, opacity: 1, visible: true, fid: parent, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] };
  for (let j = baked.idx.length - 1; j >= 0; j--) S.layers.splice(baked.idx[j], 1);
  S.folders = S.folders.filter((sf) => !folderChain(sf.id).some((x) => x.id === f.id));
  S.layers.splice(at, 0, merged); S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emitDoc(); toast(t('toast.layersMerged')); }

export function doMerge() { const f = selectedFolder(); if (f) { mergeFolder(f); return; } let idx = selectedIdx();
  if (idx.length < 2) { if (S.cur > 0) idx = [S.cur - 1, S.cur]; else { toast(t('toast.markLayers')); return; } }
  mergeIndices(idx); }

// слить диапазон слоёв [a..b] (щипок), независимо от выбора
export function mergeRange(a, b) { const idx = []; for (let i = Math.min(a, b); i <= Math.max(a, b); i++) idx.push(i); mergeIndices(idx); }

function activeAfterDelete(idx) {
  const gone = new Set(idx), curObj = S.layers[S.cur]; let target = gone.has(S.cur) ? null : curObj;
  if (!target) { for (let i = S.cur + 1; i < S.layers.length; i++) if (!gone.has(i)) { target = S.layers[i]; break; } // слой НАД удаляемым (выше в списке)
    if (!target) for (let i = S.cur - 1; i >= 0; i--) if (!gone.has(i)) { target = S.layers[i]; break; } } // иначе под ним
  return () => { if (!S.layers.length) { S.cur = 0; S.bgSel = true; return; } // удалили всё → активным становится фон
    S.cur = target && S.layers.includes(target) ? S.layers.indexOf(target) : 0; };
}

function effectOwner(eff) {
  for (let i = 0; i < S.layers.length; i++) if ((S.layers[i].effects || []).includes(eff)) return { layer: i };
  for (const f of S.folders) if ((f.effects || []).includes(eff)) return { fid: f.id };
  return null;
}

// сгруппировать ВСЁ выделенное: слои (активный + отмеченные), выделенные папки и
// владельцев выделенных эффектов/настроек — всё уезжает в одну новую папку
export function doGroup() {
  const layerSet = new Set(S.marked);
  if (S.selFolder == null && !S.fxCur && !S.bgSel) layerSet.add(S.cur); // активный слой входит, только если primary именно слой
  const folderSet = new Set(S.markedFolders);
  for (const eff of S.fxSel) { const o = effectOwner(eff); if (!o) continue; if (o.layer != null) layerSet.add(o.layer); else folderSet.add(o.fid); }
  // папку, чей предок тоже выделен, не двигаем отдельно — она уедет вместе с ним
  const folders = [...folderSet].map((id) => S.folders.find((f) => f.id === id)).filter(Boolean)
    .filter((f) => !folderChain(f.parent ?? null).some((x) => folderSet.has(x.id)));
  const inSelFolder = (i) => folderChain(S.layers[i].fid).some((x) => folderSet.has(x.id)); // слой внутри выделенной папки едет с ней
  const idx = [...layerSet].filter((i) => S.layers[i] && !inSelFolder(i)).sort((a, b) => a - b);
  if (!idx.length && !folders.length) return;
  snapshot();
  const parents = new Set([...idx.map((i) => S.layers[i].fid ?? null), ...folders.map((f) => f.parent ?? null)]);
  const parent = parents.size === 1 ? [...parents][0] : null; // всё из одной папки → вложим туда
  const id = nextFolderId(); const f = { id, name: nextFolderName(), open: true, visible: true, symLock: false, parent, effects: [] };
  S.folders.push(f);
  for (const sf of folders) sf.parent = id; // выделенные папки вкладываем в новую
  const moved = [];
  for (let j = idx.length - 1; j >= 0; j--) moved.unshift(S.layers.splice(idx[j], 1)[0]);
  moved.forEach((L) => { L.fid = id; }); clearFolderEmptyPos(id);
  const at = idx.length ? idx[0] : S.layers.length; S.layers.splice(at, 0, ...moved);
  S.cur = moved.length ? at + moved.length - 1 : Math.min(S.cur, S.layers.length - 1);
  S.marked.clear(); S.markedFolders = new Set(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emitDoc(); toast(t('toast.folderCreated')); }

export function duplicateLayer(L) { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  const idx = S.layers.indexOf(L); if (idx < 0) return; snapshot();
  S.layers.splice(idx + 1, 0, cloneLayer(L, { name: L.name + ' ' + t('layer.copySuffix'), reference: false }));
  S.cur = idx + 1; S.marked.clear(); dirtyAll(); bus.emitDoc(); toast(t('toast.layerDup')); }

export function symmetrizeLayerRefs(layers) { const ts = layers.filter((L) => S.layers.includes(L)); if (!ts.length) return;
  snapshot(); const v = S.sym || (!S.sym && !S.symH), h = S.symH;
  for (const L of ts) { symmetrizeGrid(L.grid, v, h); markDirty(S.layers.indexOf(L)); }
  bus.emitDoc(); }

// переключатели свойств слоя — общие для свайпов и контекстного меню
export function toggleLock(L) { snapshot(); L.lock = !L.lock; bus.emit('layers'); }
export function toggleAlphaLock(L) { snapshot(); L.alphaLock = !L.alphaLock; bus.emit('layers'); }
export function toggleClip(L) { snapshot(); L.clip = !L.clip; bus.emitDoc(); }
export function toggleReference(L) { if (!L) return; snapshot(); const on = !L.reference;
  for (const x of S.layers) if (x !== L) x.reference = false;
  L.reference = on; bus.emit('layers'); }
const layerHasContent = (L) => gridHasPixels(L.grid) || !!L.ext.size || (isTilemap(L) && L.tilemap.cells.some(Boolean));
export function clearLayerContent(L) {
  const idx = S.layers.indexOf(L); if (idx < 0 || !layerHasContent(L)) return false;
  if (isTilemap(L)) { L.tilemap.cells = new Array(L.tilemap.mapW * L.tilemap.mapH).fill(null); rasterLayer(idx); }
  else { L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(idx); }
  return true;
}
export function clearLayerRef(L) { const idx = S.layers.indexOf(L); if (idx < 0 || !layerHasContent(L)) return; snapshot();
  clearLayerContent(L); bus.emitDoc(); toast(t('toast.layerCleared')); }

export function deleteLayerRef(L) { // фон неудаляем; пиксельных слоёв может остаться ноль
  const idx = S.layers.indexOf(L); if (idx < 0) return; const restoreActive = activeAfterDelete([idx]);
  const restoreEmptyFolders = rememberEmptyFolderPositions([idx]);
  snapshot(); S.layers.splice(idx, 1); restoreEmptyFolders(); restoreActive(); S.marked.clear(); dirtyAll(); bus.emitDoc(); }

export function duplicateFolder(f) { const kids = folderLayers(f); if (!kids.length) return;
  if (S.layers.length + kids.length > MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshot();
  const subs = S.folders.filter((sf) => folderChain(sf.id).some((x) => x.id === f.id)); // f + все потомки
  const map = new Map(); // имена и id новых папок — уникальны; пушим сразу, чтобы следующие копии это учитывали
  for (const sf of subs) { const nf = { ...sf, id: nextFolderId(), name: uniqueFolderName(sf === f ? sf.name + ' ' + t('layer.copySuffix') : sf.name), effects: cloneFx(sf.effects) }; delete nf.emptyPos; map.set(sf.id, nf); S.folders.push(nf); }
  for (const sf of subs) { const nf = map.get(sf.id); nf.parent = (sf === f) ? (f.parent ?? null) : (map.has(sf.parent) ? map.get(sf.parent).id : sf.parent ?? null); }
  const copies = kids.map((L) => cloneLayer(L, { name: L.name + ' ' + t('layer.copySuffix'), fid: map.get(L.fid).id, reference: false }));
  const dst = topOfFolder(f.id) + 1; S.layers.splice(dst, 0, ...copies); S.cur = dst + copies.length - 1; S.marked.clear(); dirtyAll(); bus.emitDoc(); toast(t('toast.folderDup')); }

// удалить папку и всё её содержимое (слои + вложенные папки)
export function deleteFolder(f) {
  snapshot();
  for (let i = S.layers.length - 1; i >= 0; i--) if (folderChain(S.layers[i].fid).some((x) => x.id === f.id)) S.layers.splice(i, 1);
  S.folders = S.folders.filter((sf) => sf !== f && !folderChain(sf.id).some((x) => x.id === f.id));
  if (!S.layers.length) { S.cur = 0; S.bgSel = true; } else S.cur = Math.min(S.cur, S.layers.length - 1); // всё удалено → фон активен
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null;
  dirtyAll(); bus.emitDoc(); }

export function deleteLayer() {
  if (S.bgSel) return; // фон не удаляется
  if (S.fxCur || S.fxSel.size) { actions.run('fx.delete'); return; } // выбран эффект → удаляем эффект, а не слой
  // удалить всё выделенное: слои S.marked+S.cur и содержимое выделенных папок
  const allIdx = new Set(selectedIdx());
  const markedFids = [...S.markedFolders];
  for (const fid of markedFids) { const f = S.folders.find((x) => x.id === fid); if (!f) continue;
    for (const L of folderLayers(f)) { const i = S.layers.indexOf(L); if (i >= 0) allIdx.add(i); } }
  const idx = [...allIdx].filter((i) => S.layers[i]).sort((a, b) => a - b);
  if (!idx.length) return; // нечего удалять (фон обрабатывается отдельной командой)
  const restoreActive = activeAfterDelete(idx);
  const removedFids = new Set(S.folders.filter((sf) => markedFids.includes(sf.id) || folderChain(sf.id).some((x) => markedFids.includes(x.id))).map((sf) => sf.id));
  const restoreEmptyFolders = rememberEmptyFolderPositions(idx, removedFids); snapshot();
  if (markedFids.length) S.folders = S.folders.filter((sf) => !markedFids.includes(sf.id) && !folderChain(sf.id).some((x) => markedFids.includes(x.id)));
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  restoreEmptyFolders(); restoreActive();
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; dirtyAll(); bus.emitDoc(); }

actions.register('layer.add', doAddLayer);
actions.register('layer.merge', doMerge);
actions.register('layer.group', doGroup);
actions.register('layer.delete', deleteLayer); // удалить активную строку (слой/папка/эффект/настройка) — корзина и Delete
