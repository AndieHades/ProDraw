import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { shell } from "electron";
import channels from "./ipc-channels.cjs";
import {
  brushFilePath as filePath, brushRoot, brushSetPath as setPath,
  isBrushFileName, pathExists as exists, safeBrushSegment as safeSegment
} from "./brush-storage-paths.mjs";
import { brushSetSeedVersion, seedBrushSet } from "./brush-seed.mjs";
import { restoreBrushTrash } from "./brush-trash.mjs";
import { handleTrusted } from "./trusted-ipc.mjs";

async function seed(setName, files) {
  await seedBrushSet(setName, files);
}

async function listSets() {
  const root = brushRoot();
  await mkdir(root, { recursive: true });
  const entries = await readdir(root, { withFileTypes: true });
  const sets = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const directory = setPath(entry.name);
    const files = [];
    for (const file of await readdir(directory, { withFileTypes: true })) {
      if (!file.isFile() || !isBrushFileName(file.name)) continue;
      const details = await stat(path.join(directory, file.name));
      files.push({ fileName: file.name, byteLength: details.size,
        modifiedAt: details.mtimeMs });
    }
    const seedVersion = await brushSetSeedVersion(directory);
    sets.push({ name: entry.name, seeded: seedVersion !== null, seedVersion,
      files: files.sort((a, b) =>
      a.fileName.localeCompare(b.fileName)) });
  }
  return sets.sort((a, b) => a.name.localeCompare(b.name));
}

async function atomicNewFile(setName, fileName, bytes) {
  const directory = setPath(setName);
  const target = filePath(setName, fileName);
  await mkdir(directory, { recursive: true });
  if (await exists(target)) throw new Error("Brush file already exists");
  const temporary = path.join(directory, `.${randomUUID()}.tmp`);
  await writeFile(temporary, Buffer.from(bytes), { flag: "wx" });
  try { await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
}

async function trashFile(setName, fileName) {
  const source = filePath(setName, fileName);
  const trash = path.join(brushRoot(), ".trash", safeSegment(setName, "brush set name"));
  await mkdir(trash, { recursive: true });
  await rename(source, path.join(trash,
    `${Date.now()}-${randomUUID()}-${path.basename(source)}`));
}

async function trashSet(setName) {
  const name = safeSegment(setName, "brush set name");
  const trash = path.join(brushRoot(), ".trash", "sets");
  await mkdir(trash, { recursive: true });
  await rename(setPath(name), path.join(trash, `${Date.now()}-${randomUUID()}-${name}`));
}

async function readState() {
  try { return await readFile(path.join(brushRoot(), ".library-v1.json"), "utf8"); }
  catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeState(json) {
  if (typeof json !== "string" || json.length > 2_000_000) {
    throw new Error("Invalid brush library state");
  }
  JSON.parse(json);
  const root = brushRoot();
  const target = path.join(root, ".library-v1.json");
  const temporary = path.join(root, `.${randomUUID()}.library.tmp`);
  await mkdir(root, { recursive: true });
  await writeFile(temporary, json, { flag: "wx" });
  try { await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
}

export function registerBrushIpc() {
  handleTrusted(channels.brushSeed, (_event, request) => seed(request.setName, request.files));
  handleTrusted(channels.brushList, () => listSets());
  handleTrusted(channels.brushRead, async (_event, request) =>
    Uint8Array.from(await readFile(filePath(request.setName, request.fileName))).buffer);
  handleTrusted(channels.brushWrite, (_event, request) =>
    atomicNewFile(request.setName, request.fileName, request.bytes));
  handleTrusted(channels.brushTrash, (_event, request) =>
    trashFile(request.setName, request.fileName));
  handleTrusted(channels.brushCreateSet, (_event, name) =>
    mkdir(setPath(name), { recursive: false }));
  handleTrusted(channels.brushRenameSet, (_event, request) =>
    rename(setPath(request.from), setPath(request.to)));
  handleTrusted(channels.brushMove, (_event, request) =>
    rename(filePath(request.fromSet, request.fileName),
      filePath(request.toSet, request.fileName)));
  handleTrusted(channels.brushTrashSet, (_event, setName) => trashSet(setName));
  handleTrusted(channels.brushRestoreTrash, () => restoreBrushTrash());
  handleTrusted(channels.brushRevealFolder, async (_event, setName) => {
    const target = setName === null ? brushRoot() : setPath(setName);
    await mkdir(target, { recursive: true });
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  });
  handleTrusted(channels.brushStateRead, () => readState());
  handleTrusted(channels.brushStateWrite, (_event, json) => writeState(json));
}
