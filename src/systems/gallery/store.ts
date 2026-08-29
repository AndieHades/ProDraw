import { getDoc, getGalleryDoc, listGalleryDocs, removeDoc, saveDoc,
  updateGalleryDoc } from "../../core/storage.ts";
import type { GalleryRecord, StoredRecord } from "../../core/storage.ts";
import { t } from "../../i18n/index.ts";

type StoredWork = StoredRecord & Partial<GalleryRecord>;
export const uid = (prefix = "d"): string => `${prefix}${Date.now().toString(36)}${
  Math.random().toString(36).slice(2, 6)}`;
const padded = (index: number): string => String(index).padStart(2, "0");
export async function nextFolderName(base: string): Promise<string> {
  const used = new Set((await listGalleryDocs()).map((record) => record.name));
  for (let index = 1; ; index++) {
    const name = `${base} ${padded(index)}`; if (!used.has(name)) return name;
  }
}
export async function uniqueName(base: string, exceptId?: string): Promise<string> {
  const used = new Set((await listGalleryDocs()).filter((record) =>
    record.id !== exceptId).map((record) => record.name));
  if (!used.has(base)) return base;
  for (let index = 2; ; index++) {
    const name = `${base} ${padded(index)}`; if (!used.has(name)) return name;
  }
}
export const listAll = (): Promise<GalleryRecord[]> => listGalleryDocs();
export async function childrenOf(folder: string | null | undefined): Promise<GalleryRecord[]> {
  return (await listGalleryDocs()).filter((record) =>
    (record.folder ?? null) === (folder ?? null));
}
export const getItem = getGalleryDoc;
export async function loadStoredWork(id: string): Promise<StoredWork | null> {
  const [record, metadata] = await Promise.all([getDoc(id), getGalleryDoc(id)]);
  return record ? { ...record, ...metadata } : null;
}
export async function createFolder(name: string, childIds: readonly string[],
  parent: string | null = null, order = Date.now()): Promise<string> {
  const id = uid("f");
  await saveDoc({ id, kind: "folder", name, folder: parent, order, updated: Date.now() });
  await moveToFolder(childIds, id); return id;
}
export async function moveToFolder(ids: readonly string[], folder: string | null): Promise<void> {
  for (const id of ids) await updateGalleryDoc(id, { folder, updated: Date.now() });
}
export const setOrder = (id: string, order: number): Promise<boolean> =>
  updateGalleryDoc(id, { order });
export async function renameItem(id: string, name: string): Promise<boolean> {
  return updateGalleryDoc(id, { name: await uniqueName(name, id), updated: Date.now() });
}
export async function removeItem(id: string, seen = new Set<string>()): Promise<void> {
  if (seen.has(id)) return; seen.add(id);
  for (const child of await childrenOf(id)) await removeItem(child.id, seen);
  await removeDoc(id);
}
const recordName = (record: StoredWork): string =>
  typeof record.name === "string" ? record.name : "Untitled";
async function duplicateStoredItem(id: string, parent: string | null | undefined,
  seen: Set<string>): Promise<string | undefined> {
  if (seen.has(id)) return undefined; seen.add(id);
  const record = await loadStoredWork(id); if (!record) return undefined;
  const folder = record.kind === "folder", nextId = uid(folder ? "f" : "d");
  const name = await uniqueName(`${recordName(record)} ${t("layer.copySuffix")}`);
  await saveDoc({ ...record, id: nextId, folder: parent ?? record.folder ?? null,
    name, updated: Date.now(), order: Date.now() });
  if (folder) for (const child of await childrenOf(id))
    await duplicateStoredItem(child.id, nextId, seen);
  return nextId;
}
export const duplicateItem = (id: string, parent?: string | null): Promise<string | undefined> =>
  duplicateStoredItem(id, parent, new Set());
export async function folderStats(id: string): Promise<{ files: number; updated: number }> {
  let files = 0, updated = 0; const seen = new Set<string>();
  const walk = async (folder: string): Promise<void> => {
    if (seen.has(folder)) return; seen.add(folder);
    for (const record of await childrenOf(folder)) if (record.kind === "folder")
      await walk(record.id); else { files++; updated = Math.max(updated,
        record.updated || record.order || 0); }
  };
  await walk(id); return { files, updated };
}
export async function folderPreviews(folderId: string): Promise<string[]> {
  return (await childrenOf(folderId)).slice(0, 4).map((record) => record.preview)
    .filter(Boolean);
}
