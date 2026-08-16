// Общая выборка слоёв-целей для операций по активному выбору в панели слоёв.
import { S } from './state.js';
import { folderChain } from './layers.js';

const inFolder = (L, fid) => folderChain(L.fid).some((f) => f.id === fid);
const folderLayers = (fid) => S.layers.filter((L) => inFolder(L, fid));

export function selectedLayerTargets() {
  const out = new Set(), fids = new Set(S.markedFolders);
  if (S.selFolder != null) fids.add(S.selFolder);
  for (const fid of fids) for (const L of folderLayers(fid)) out.add(L);
  for (const i of S.marked) if (S.layers[i]) out.add(S.layers[i]);
  if (!fids.size || S.marked.size) if (S.layers[S.cur]) out.add(S.layers[S.cur]);
  return [...out].filter((L) => S.layers.includes(L));
}

// цели одношаговых операций (флип/симметрия): выбран фон → весь документ (все
// слои), иначе — выбранные слой/папка/набор (эффект/настройка → активный слой).
export function opTargets() {
  if (S.bgSel) return S.layers.filter(Boolean);
  return selectedLayerTargets();
}
