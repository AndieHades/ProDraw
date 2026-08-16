import { access, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { app, ipcMain } from "electron";
import channels from "./ipc-channels.cjs";

const allowedExtension = /\.(brush|prodraw-brush)$/i;

function safeSegment(value, label) {
  const segment = String(value).trim();
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  if (!segment || segment.startsWith(".") || /[<>:"/\\|?*]/.test(segment) ||
      /[. ]$/.test(segment) || reserved.test(segment) || path.basename(segment) !== segment) {
    throw new Error(`Invalid ${label}`);
  }
  return segment;
}

function brushRoot() {
  return path.join(app.getPath("userData"), "brushes");
}

function setPath(name) {
  return path.join(brushRoot(), safeSegment(name, "brush set name"));
}

function filePath(setName, fileName) {
  const safeFile = safeSegment(fileName, "brush file name");
  if (!allowedExtension.test(safeFile)) throw new Error("Unsupported brush file extension");
  return path.join(setPath(setName), safeFile);
}

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function seed(setName, files) {
  const directory = setPath(setName);
  const marker = path.join(directory, ".seeded-v1");
  await mkdir(directory, { recursive: true });
  if (await exists(marker)) return;
  for (const file of files) {
    const target = filePath(setName, file.fileName);
    if (!(await exists(target))) await writeFile(target, Buffer.from(file.bytes), { flag: "wx" });
  }
  await writeFile(marker, new Date().toISOString(), { flag: "wx" });
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
      if (!file.isFile() || !allowedExtension.test(file.name)) continue;
      const details = await stat(path.join(directory, file.name));
      files.push({ fileName: file.name, byteLength: details.size,
        modifiedAt: details.mtimeMs });
    }
    sets.push({ name: entry.name, seeded: await exists(path.join(directory, ".seeded-v1")),
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
  ipcMain.handle(channels.brushSeed, (_event, request) => seed(request.setName, request.files));
  ipcMain.handle(channels.brushList, () => listSets());
  ipcMain.handle(channels.brushRead, async (_event, request) =>
    Array.from(await readFile(filePath(request.setName, request.fileName))));
  ipcMain.handle(channels.brushWrite, (_event, request) =>
    atomicNewFile(request.setName, request.fileName, request.bytes));
  ipcMain.handle(channels.brushTrash, (_event, request) =>
    trashFile(request.setName, request.fileName));
  ipcMain.handle(channels.brushCreateSet, (_event, name) =>
    mkdir(setPath(name), { recursive: false }));
  ipcMain.handle(channels.brushRenameSet, (_event, request) =>
    rename(setPath(request.from), setPath(request.to)));
  ipcMain.handle(channels.brushMove, (_event, request) =>
    rename(filePath(request.fromSet, request.fileName),
      filePath(request.toSet, request.fileName)));
  ipcMain.handle(channels.brushTrashSet, (_event, setName) => trashSet(setName));
  ipcMain.handle(channels.brushStateRead, () => readState());
  ipcMain.handle(channels.brushStateWrite, (_event, json) => writeState(json));
}
