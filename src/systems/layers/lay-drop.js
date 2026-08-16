// Данные-операции переноса слоёв/папок (сам жест — dragRow из drag.js): между
// собой и внутрь папки. Зеркало fx-drag.js, но для слоёв и групп.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { folderChain } from '../../core/layers.js';
import { topOfFolder, folderLayers, folderInsertIndex, clearFolderEmptyPos, rememberEmptyFolderPositions } from './helpers.js';

// выделение для перетаскивания: слои S.marked+S.cur + слои из выделенных папок
export function dragBlock(srcIdx) { const sel = new Set(S.marked); sel.add(S.cur);
  for (const fid of S.markedFolders) { const f = S.folders.find((x) => x.id === fid);
    if (f) for (const L of folderLayers(f)) { const i = S.layers.indexOf(L); if (i >= 0) sel.add(i); } }
  return (sel.size > 1 && (sel.has(srcIdx) || S.markedFolders.size > 0)) ? [...sel].filter((i) => S.layers[i]).sort((a, b) => a - b).map((i) => S.layers[i]) : [S.layers[srcIdx]]; }

// набор папок для перетаскивания: все выделенные папки если src в их числе, иначе одна
function dragFolderBlock(srcFid) {
  return (S.markedFolders.has(srcFid) && S.markedFolders.size > 1)
    ? [...S.markedFolders].map((fid) => S.folders.find((f) => f.id === fid)).filter(Boolean)
    : [S.folders.find((f) => f.id === srcFid)].filter(Boolean); }

// можно ли бросить перетаскиваемое внутрь папки fid (нельзя в себя/в своё поддерево)
export function canIntoFolder(info, fid) {
  if (info.kind === 'layer') return true;
  return !dragFolderBlock(info.fid).some((f) => folderChain(fid).some((x) => x.id === f.id)); }

export function layDrop(src, row, into, below) { const tIsFolder = row.classList.contains('frow');
  if (src.kind === 'layer') { const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    const block = dragBlock(src.idx);
    if (tL && block.includes(tL)) return;
    const movedIdx = block.map((L) => S.layers.indexOf(L)).filter((i) => i >= 0);
    const restoreEmptyFolders = rememberEmptyFolderPositions(movedIdx);
    snapshot();
    for (const L of block) { const i = S.layers.indexOf(L); if (i >= 0) S.layers.splice(i, 1); }
    const dstFid = tIsFolder ? (into ? tFid : null) : (tL ? tL.fid : null);
    for (const L of block) L.fid = dstFid;
    // список рисуется сверху вниз от большего индекса к меньшему: «над целью» = индекс цели+1, «под целью» = индекс цели
    let dstIdx = tIsFolder ? folderInsertIndex(tFid) : S.layers.indexOf(tL) + (below ? 0 : 1); if (dstIdx < 0) dstIdx = S.layers.length;
    S.layers.splice(dstIdx, 0, ...block); restoreEmptyFolders(); clearFolderEmptyPos(dstFid);
    const ni = block.map((L) => S.layers.indexOf(L)).filter((i) => i >= 0); // сохранить выделение на новом месте
    S.cur = ni[ni.length - 1]; S.marked = ni.length > 1 ? new Set(ni) : new Set(); S.markedFolders.clear(); S.selFolder = null;
  } else { const foldersToMove = dragFolderBlock(src.fid);
    const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    if (tIsFolder && foldersToMove.some((f) => f.id === +row.dataset.fid)) return;
    if (foldersToMove.some((f) => (tL && folderChain(tL.fid).some((x) => x.id === f.id)) || (tFid != null && folderChain(tFid).some((x) => x.id === f.id)))) return;
    snapshot(); const block = [];
    for (let i = S.layers.length - 1; i >= 0; i--) if (foldersToMove.some((f) => folderChain(S.layers[i].fid).some((x) => x.id === f.id))) block.unshift(S.layers.splice(i, 1)[0]);
    const newParent = tIsFolder ? (into ? tFid : (S.folders.find((f) => f.id === tFid)?.parent ?? null)) : (tL ? (tL.fid ?? null) : null);
    for (const f of foldersToMove) f.parent = newParent;
    let dstIdx; if (tIsFolder) dstIdx = folderInsertIndex(tFid); else if (tL && tL.fid != null) dstIdx = topOfFolder(tL.fid) + 1; else dstIdx = (tL ? S.layers.indexOf(tL) : S.layers.length - 1) + 1;
    dstIdx = Math.min(Math.max(dstIdx, 0), S.layers.length);
    if (block.length) S.layers.splice(dstIdx, 0, ...block);
    else for (const f of foldersToMove) f.emptyPos = dstIdx;
    for (const f of foldersToMove) if (block.length) delete f.emptyPos;
    clearFolderEmptyPos(newParent);
    S.cur = Math.min(S.cur, S.layers.length - 1); S.markedFolders = new Set(foldersToMove.map((f) => f.id)); S.selFolder = foldersToMove[0] ? foldersToMove[0].id : null; S.marked.clear(); }
  dirtyAll(); bus.emitDoc(); }
