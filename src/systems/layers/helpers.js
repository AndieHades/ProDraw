// Общие запросы по слоям/папкам (с учётом вложенных групп).
import { S } from '../../core/state.js';
import { t } from '../../ui/dom/ShellDom.ts';
import { localeValues } from '../../i18n/index.ts';
import { captureEmptyFolderPositions, clearEmptyFolderPositions,
  commonLayerParent, folderInsertionIndex, folderStackPosition,
  layerIndicesInFolder, layersInFolder, restoreEmptyFolderPositions,
  topOfFolder as treeTopOfFolder } from '../../core/layers/LayerTree.ts';

export const folderLayers = (folder) => layersInFolder(S, folder.id);
export const folderLayerIndices = (folder) => layerIndicesInFolder(S, folder.id);
export const topOfFolder = (folderId) => treeTopOfFolder(S, folderId);
export const folderStackPos = (folder) => folderStackPosition(S, folder);
export const folderInsertIndex = (folderId) => folderInsertionIndex(S, folderId);
export const clearFolderEmptyPos = (folderId) =>
  clearEmptyFolderPositions(S, folderId);
export function rememberEmptyFolderPositions(idx, skipFids = new Set()) {
  const anchors = captureEmptyFolderPositions(S, idx, skipFids);
  return () => restoreEmptyFolderPositions(S, anchors);
}
// общая родительская папка набора слоёв (если одна) — новая группа вложится в неё
export const commonParent = (layers) => commonLayerParent(layers);
// выделенные слои = активный + отмеченные; одиночные операции работают и над ними
export const selectedIdx = () => [...new Set([...S.marked, S.cur])].filter((i) => S.layers[i]).sort((a, b) => a - b);

// активная строка для ползунка прозрачности: эффект/настройка → папка → слой.
// У каждой свой opacity (по умолчанию 1), ползунок правит именно её.
export function activeOpacityRef() {
  if (S.fxCur) return S.fxCur;
  if (S.selFolder != null) return S.folders.find((f) => f.id === S.selFolder) || null;
  return S.layers[S.cur] || null;
}

// следующий id папки — заведомо больше всех существующих (даже если folderSeq
// отстал после загрузки старого проекта) → никаких коллизий id у папок
export function nextFolderId() { const max = S.folders.reduce((m, f) => Math.max(m, f.id), 0);
  S.folderSeq = Math.max(S.folderSeq, max) + 1; return S.folderSeq; }
// уникальное имя папки: к занятому добавляем счётчик («База 2», «База 3», …)
export function uniqueFolderName(base) { const used = new Set(S.folders.map((f) => f.name));
  if (!used.has(base)) return base; let n = 2; while (used.has(base + ' ' + n)) n++; return base + ' ' + n; }
export function nextFolderName() {
  const bases = localeValues('folder.name').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('^(?:' + bases.join('|') + ')\\s+(\\d+)$');
  const used = new Set();
  for (const f of S.folders) { const m = (f.name || '').trim().match(re); if (m) used.add(+m[1]); }
  let n = 1; while (used.has(n)) n++;
  return t('folder.name') + ' ' + n;
}
