// Reversible layer/folder topology. Pixel payloads are referenced, never cloned.
import { S, newLayer, cloneFx, cloneLayer } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { snapshotStructure } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { toast, t } from '../../ui/dom/ShellDom.ts';
import { MAX_LAYERS } from '../../config/limits.ts';
import { folderChain } from '../../core/layers.js';
import { localeValues } from '../../i18n/index.ts';
import { clearFolderEmptyPos, folderLayers, nextFolderId, nextFolderName,
  topOfFolder, uniqueFolderName } from './helpers.js';

const structuralDirty = () => dirtyAll({ preserveGridBounds: true });
const escRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function nextLayerName() {
  const bases = localeValues('layer.name').map(escRe);
  const re = new RegExp('^(?:' + bases.join('|') + ')\\s+(\\d+)$');
  let max = 0;
  for (const layer of S.layers) { const match = (layer.name || '').trim().match(re);
    if (match) max = Math.max(max, +match[1]); }
  S.layerSeq = max + 1; return t('layer.name') + ' ' + S.layerSeq;
}

const effectOwner = (effect) => {
  for (let index = 0; index < S.layers.length; index++)
    if ((S.layers[index].effects || []).includes(effect)) return { layer: index };
  for (const folder of S.folders)
    if ((folder.effects || []).includes(effect)) return { fid: folder.id };
  return null;
};

export function doAddLayer() {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshotStructure(); const current = S.layers[S.cur];
  const chain = current ? folderChain(current.fid) : [];
  const inOpenFolder = !S.selFolder && current && current.fid != null &&
    chain.every((folder) => folder.open);
  const layer = newLayer(nextLayerName(), S.W, S.H);
  layer.fid = inOpenFolder ? current.fid : null;
  const at = inOpenFolder ? S.cur + 1 : S.layers.length;
  S.layers.splice(at, 0, layer); clearFolderEmptyPos(layer.fid);
  S.cur = at; S.selFolder = null; S.bgSel = false; S.marked.clear();
  S.markedFolders.clear(); S.fxSel.clear(); S.fxCur = null;
  structuralDirty(); bus.emitDoc();
}

export function doGroup() {
  const layerSet = new Set(S.marked);
  if (S.selFolder == null && !S.fxCur && !S.bgSel) layerSet.add(S.cur);
  const folderSet = new Set(S.markedFolders);
  for (const effect of S.fxSel) { const owner = effectOwner(effect); if (!owner) continue;
    if (owner.layer != null) layerSet.add(owner.layer); else folderSet.add(owner.fid); }
  const folders = [...folderSet].map((id) => S.folders.find((folder) => folder.id === id))
    .filter(Boolean).filter((folder) => !folderChain(folder.parent ?? null)
      .some((parent) => folderSet.has(parent.id)));
  const inSelectedFolder = (index) => folderChain(S.layers[index].fid)
    .some((folder) => folderSet.has(folder.id));
  const indices = [...layerSet].filter((index) => S.layers[index] &&
    !inSelectedFolder(index)).sort((left, right) => left - right);
  if (!indices.length && !folders.length) return;
  snapshotStructure();
  const parents = new Set([...indices.map((index) => S.layers[index].fid ?? null),
    ...folders.map((folder) => folder.parent ?? null)]);
  const parent = parents.size === 1 ? [...parents][0] : null;
  const id = nextFolderId();
  S.folders.push({ id, name: nextFolderName(), open: true, visible: true,
    symLock: false, parent, effects: [] });
  for (const folder of folders) folder.parent = id;
  const moved = [];
  for (let offset = indices.length - 1; offset >= 0; offset--)
    moved.unshift(S.layers.splice(indices[offset], 1)[0]);
  for (const layer of moved) layer.fid = id;
  clearFolderEmptyPos(id); const at = indices.length ? indices[0] : S.layers.length;
  S.layers.splice(at, 0, ...moved);
  S.cur = moved.length ? at + moved.length - 1 : Math.min(S.cur, S.layers.length - 1);
  S.marked.clear(); S.markedFolders = new Set(); S.selFolder = null;
  S.fxSel.clear(); S.fxCur = null; structuralDirty(); bus.emitDoc();
  toast(t('toast.folderCreated'));
}

export function duplicateLayer(layer) {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  const index = S.layers.indexOf(layer); if (index < 0) return; snapshotStructure();
  const copy = cloneLayer(layer, { name: layer.name + ' ' + t('layer.copySuffix'),
    reference: false });
  S.layers.splice(index + 1, 0, copy); S.cur = index + 1; S.marked.clear();
  structuralDirty(); bus.emitDoc(); toast(t('toast.layerDup'));
}

export function duplicateFolder(folder) {
  const children = folderLayers(folder); if (!children.length) return;
  if (S.layers.length + children.length > MAX_LAYERS) {
    toast(t('toast.maxLayers')); return; }
  snapshotStructure();
  const subtree = S.folders.filter((item) => folderChain(item.id)
    .some((parent) => parent.id === folder.id));
  const copies = new Map();
  for (const item of subtree) { const copy = { ...item, id: nextFolderId(),
    name: uniqueFolderName(item === folder ? item.name + ' ' +
      t('layer.copySuffix') : item.name), effects: cloneFx(item.effects) };
    delete copy.emptyPos; copies.set(item.id, copy); S.folders.push(copy); }
  for (const item of subtree) { const copy = copies.get(item.id);
    copy.parent = item === folder ? (folder.parent ?? null) :
      (copies.get(item.parent)?.id ?? item.parent ?? null); }
  const layerCopies = children.map((layer) => cloneLayer(layer, {
    name: layer.name + ' ' + t('layer.copySuffix'),
    fid: copies.get(layer.fid).id, reference: false,
  }));
  const destination = topOfFolder(folder.id) + 1;
  S.layers.splice(destination, 0, ...layerCopies);
  S.cur = destination + layerCopies.length - 1; S.marked.clear();
  structuralDirty(); bus.emitDoc(); toast(t('toast.folderDup'));
}

export function ungroupFolder(folder) {
  if (!S.folders.includes(folder)) return false;
  snapshotStructure(); const parent = folder.parent ?? null;
  for (const layer of S.layers) if (layer.fid === folder.id) layer.fid = parent;
  for (const child of S.folders) if (child.parent === folder.id) child.parent = parent;
  S.folders = S.folders.filter((item) => item !== folder);
  structuralDirty(); bus.emitDoc(); return true;
}
