// Хранилище галереи поверх IndexedDB: элементы (kind 'doc'/'folder'), папки,
// перемещение, переименование, дублирование, рекурсивное удаление.
import { saveDoc, getDoc, listDocs, removeDoc } from '../../core/storage.js';
import { t } from '../../i18n/index.js';

export const uid = (p = 'd') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (i) => String(i).padStart(2, '0');

// «Project 01», «02», … — первое свободное номерное имя
export async function nextFolderName(base) { const used = new Set((await listDocs()).map((d) => d.name));
  for (let i = 1; ; i++) { const n = `${base} ${pad(i)}`; if (!used.has(n)) return n; } }
// имя без повторов: если занято — добавляет номер
export async function uniqueName(base, exceptId) { const used = new Set((await listDocs()).filter((d) => d.id !== exceptId).map((d) => d.name));
  if (!used.has(base)) return base; for (let i = 2; ; i++) { const n = `${base} ${pad(i)}`; if (!used.has(n)) return n; } }

export const listAll = () => listDocs();
export const childrenOf = async (folder) => (await listDocs()).filter((d) => (d.folder ?? null) === (folder ?? null));
export const getItem = getDoc;

export async function createFolder(name, childIds, parent = null, order = Date.now()) {
  const id = uid('f');
  await saveDoc({ id, kind: 'folder', name, folder: parent ?? null, order, updated: Date.now() });
  for (const cid of childIds) { const d = await getDoc(cid); if (d) { d.folder = id; await saveDoc(d); } }
  return id;
}

export async function moveToFolder(ids, folder) {
  for (const cid of ids) { const d = await getDoc(cid); if (d) { d.folder = folder ?? null; d.updated = Date.now(); await saveDoc(d); } }
}

export async function setOrder(id, order) { const d = await getDoc(id); if (d) { d.order = order; await saveDoc(d); } }
export async function renameItem(id, name) { const d = await getDoc(id); if (d) { d.name = await uniqueName(name, id); d.updated = Date.now(); await saveDoc(d); } }

export async function removeItem(id) { for (const k of await childrenOf(id)) await removeItem(k.id); await removeDoc(id); }

export async function duplicateItem(id, parent) { const d = await getDoc(id); if (!d) return;
  const nid = uid(d.kind === 'folder' ? 'f' : 'd'), name = await uniqueName(d.name + ' ' + t('layer.copySuffix'));
  await saveDoc({ ...d, id: nid, folder: parent ?? d.folder ?? null, name, updated: Date.now(), order: Date.now() });
  if (d.kind === 'folder') for (const k of await childrenOf(id)) await duplicateItem(k.id, nid);
}

export async function folderStats(id) { let files = 0, updated = 0; const seen = new Set();
  const walk = async (fid) => { if (seen.has(fid)) return; seen.add(fid);
    for (const d of await childrenOf(fid)) {
      if (d.kind === 'folder') await walk(d.id);
      else { files++; updated = Math.max(updated, d.updated || d.order || 0); }
    } };
  await walk(id); return { files, updated };
}

export async function folderPreviews(folderId) { return (await childrenOf(folderId)).slice(0, 4).map((d) => d.preview).filter(Boolean); }
