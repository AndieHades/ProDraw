// Reversible removal of layer-tree objects without copying their raster grids.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.js';
import * as bus from '../../core/bus.js';
import { snapshotStructure } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { folderChain } from '../../core/layers.js';
import { folderLayers, rememberEmptyFolderPositions, selectedIdx } from './helpers.js';

const structuralDirty = () => dirtyAll({ preserveGridBounds: true });

function activeAfterDelete(indices) {
  const gone = new Set(indices), current = S.layers[S.cur];
  let target = gone.has(S.cur) ? null : current;
  if (!target) for (let index = S.cur + 1; index < S.layers.length; index++)
    if (!gone.has(index)) { target = S.layers[index]; break; }
  if (!target) for (let index = S.cur - 1; index >= 0; index--)
    if (!gone.has(index)) { target = S.layers[index]; break; }
  return () => { if (!S.layers.length) { S.cur = 0; S.bgSel = true; }
    else S.cur = target && S.layers.includes(target) ? S.layers.indexOf(target) : 0; };
}

export function deleteLayerRef(layer) {
  const index = S.layers.indexOf(layer); if (index < 0) return false;
  const restoreActive = activeAfterDelete([index]);
  const restoreEmptyFolders = rememberEmptyFolderPositions([index]);
  snapshotStructure(); S.layers.splice(index, 1);
  restoreEmptyFolders(); restoreActive(); S.marked.clear();
  structuralDirty(); bus.emitDoc(); return true;
}

export function deleteFolder(folder) {
  if (!S.folders.includes(folder)) return false;
  snapshotStructure();
  for (let index = S.layers.length - 1; index >= 0; index--)
    if (folderChain(S.layers[index].fid).some((item) => item.id === folder.id))
      S.layers.splice(index, 1);
  S.folders = S.folders.filter((item) => item !== folder &&
    !folderChain(item.id).some((parent) => parent.id === folder.id));
  if (!S.layers.length) { S.cur = 0; S.bgSel = true; }
  else S.cur = Math.min(S.cur, S.layers.length - 1);
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null;
  structuralDirty(); bus.emitDoc(); return true;
}

export function deleteLayer() {
  if (S.bgSel) return false;
  if (S.fxCur || S.fxSel.size) return actions.run('fx.delete');
  const allIndices = new Set(selectedIdx());
  const markedFolderIds = [...S.markedFolders];
  for (const id of markedFolderIds) { const folder = S.folders.find((item) => item.id === id);
    if (!folder) continue;
    for (const layer of folderLayers(folder)) { const index = S.layers.indexOf(layer);
      if (index >= 0) allIndices.add(index); } }
  const indices = [...allIndices].filter((index) => S.layers[index])
    .sort((left, right) => left - right);
  if (!indices.length) return false;
  const restoreActive = activeAfterDelete(indices);
  const removedFolderIds = new Set(S.folders.filter((folder) =>
    markedFolderIds.includes(folder.id) || folderChain(folder.id)
      .some((parent) => markedFolderIds.includes(parent.id))).map((folder) => folder.id));
  const restoreEmptyFolders = rememberEmptyFolderPositions(indices, removedFolderIds);
  snapshotStructure();
  if (markedFolderIds.length) S.folders = S.folders.filter((folder) =>
    !markedFolderIds.includes(folder.id) && !folderChain(folder.id)
      .some((parent) => markedFolderIds.includes(parent.id)));
  for (let offset = indices.length - 1; offset >= 0; offset--)
    S.layers.splice(indices[offset], 1);
  restoreEmptyFolders(); restoreActive(); S.marked.clear();
  S.markedFolders.clear(); S.selFolder = null;
  structuralDirty(); bus.emitDoc(); return true;
}
