import { mkdir, readdir, rename, rmdir } from "node:fs/promises";
import path from "node:path";
import {
  brushFilePath, brushRoot, brushSetPath, pathExists, safeBrushSegment
} from "./brush-storage-paths.mjs";

const trashPrefix = /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i;
const entries = async (directory) => {
  try { return await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
};
const originalName = (name) => trashPrefix.exec(name)?.[1] ?? null;

async function restoreSets(root) {
  let count = 0;
  const directory = path.join(root, ".trash", "sets");
  for (const entry of await entries(directory)) {
    const name = entry.isDirectory() ? originalName(entry.name) : null;
    if (!name) continue;
    const target = brushSetPath(safeBrushSegment(name, "brush set name"));
    if (await pathExists(target)) continue;
    await rename(path.join(directory, entry.name), target); count += 1;
  }
  return count;
}

async function restoreFiles(root) {
  let count = 0;
  const trash = path.join(root, ".trash");
  for (const setEntry of await entries(trash)) {
    if (!setEntry.isDirectory() || setEntry.name === "sets") continue;
    const setName = safeBrushSegment(setEntry.name, "brush set name");
    const sourceSet = path.join(trash, setEntry.name);
    await mkdir(brushSetPath(setName), { recursive: true });
    for (const entry of await entries(sourceSet)) {
      const fileName = entry.isFile() ? originalName(entry.name) : null;
      if (!fileName) continue;
      const target = brushFilePath(setName, fileName);
      if (await pathExists(target)) continue;
      await rename(path.join(sourceSet, entry.name), target); count += 1;
    }
    if ((await entries(sourceSet)).length === 0) await rmdir(sourceSet);
  }
  return count;
}

export async function restoreBrushTrash() {
  const root = brushRoot();
  return await restoreSets(root) + await restoreFiles(root);
}
