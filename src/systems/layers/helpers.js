// Общие запросы по слоям/папкам (с учётом вложенных групп).
import { S } from '../../core/state.js';
import { folderChain } from '../../core/layers.js';
import { t } from '../../core/dom.js';
import { localeValues } from '../../i18n/index.js';

const inSubtree = (L, fid) => folderChain(L.fid).some((f) => f.id === fid); // слой лежит в поддереве папки
export const folderLayers = (f) => S.layers.filter((L) => inSubtree(L, f.id));
export const folderLayerIndices = (f) => S.layers.map((L, i) => (inSubtree(L, f.id) ? i : -1)).filter((i) => i >= 0);
export function topOfFolder(fid) { let t = -1; for (let i = 0; i < S.layers.length; i++) if (inSubtree(S.layers[i], fid)) t = i; return t; }
export function folderStackPos(f) { const idx = folderLayerIndices(f);
  if (idx.length) return Math.min(...idx);
  return Number.isFinite(f.emptyPos) ? Math.max(0, Math.min(S.layers.length, f.emptyPos)) : -1; }
export function folderInsertIndex(fid) { const top = topOfFolder(fid);
  if (top >= 0) return top + 1;
  const f = S.folders.find((x) => x.id === fid);
  return Number.isFinite(f?.emptyPos) ? Math.max(0, Math.min(S.layers.length, f.emptyPos)) : 0; }
export function clearFolderEmptyPos(fid) { for (const f of folderChain(fid)) delete f.emptyPos; }
export function rememberEmptyFolderPositions(idx, skipFids = new Set()) {
  const gone = new Set(idx), anchors = new Map();
  for (const f of S.folders) {
    if (folderChain(f.id).some((x) => skipFids.has(x.id))) continue;
    const memberIdx = folderLayerIndices(f);
    if (memberIdx.length && memberIdx.every((i) => gone.has(i))) anchors.set(f.id, Math.min(...memberIdx));
  }
  return () => {
    for (const [id, pos] of anchors) { const f = S.folders.find((x) => x.id === id);
      if (f && !folderLayerIndices(f).length) f.emptyPos = Math.max(0, Math.min(S.layers.length, pos)); }
  };
}
// общая родительская папка набора слоёв (если одна) — новая группа вложится в неё
export function commonParent(layers) { const f0 = layers.length ? (layers[0].fid ?? null) : null;
  return layers.every((L) => (L.fid ?? null) === f0) ? f0 : null; }
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
