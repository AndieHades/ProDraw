import type { DesktopBridge } from "../contracts/platform";

export interface FileTreeWriteResult {
  readonly name: string;
  readonly location: string | null;
}

export interface FileTreeWriter {
  write(path: readonly string[], blob: Blob): Promise<void>;
  commit(): Promise<FileTreeWriteResult>;
  abort(): Promise<void>;
}

interface BrowserWritable { write(value: Blob): Promise<void>; close(): Promise<void> }
interface BrowserFileHandle { createWritable(): Promise<BrowserWritable> }
interface BrowserDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }):
    Promise<BrowserDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<BrowserFileHandle>;
  removeEntry?(name: string, options?: { recursive?: boolean }): Promise<void>;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options: { mode: "readwrite" }) =>
    Promise<BrowserDirectoryHandle>;
};

export class FileTreeUnsupportedError extends Error {
  constructor() { super("Directory export is unavailable"); this.name = "FileTreeUnsupportedError"; }
}

async function desktopWriter(rootName: string,
  bridge: DesktopBridge): Promise<FileTreeWriter | null> {
  const session = await bridge.fileTree.begin(rootName);
  if (!session) return null;
  let open = true;
  return {
    async write(path, blob) {
      if (!open) throw new Error("Directory export session is closed");
      await bridge.fileTree.write(session.token, path, await blob.arrayBuffer());
    },
    async commit() {
      if (!open) throw new Error("Directory export session is closed");
      const result = await bridge.fileTree.commit(session.token); open = false; return result;
    },
    async abort() {
      if (!open) return; open = false; await bridge.fileTree.abort(session.token);
    },
  };
}

const errorName = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "name" in error
    ? String(error.name) : undefined;

async function directoryExists(parent: BrowserDirectoryHandle,
  name: string): Promise<boolean> {
  try { await parent.getDirectoryHandle(name); return true; }
  catch (error) { if (errorName(error) === "NotFoundError") return false; throw error; }
}

async function uniqueDirectory(parent: BrowserDirectoryHandle, base: string) {
  for (let index = 1; index < 10000; index += 1) {
    const name = index === 1 ? base : `${base}_${index}`;
    if (!await directoryExists(parent, name)) {
      return { name, handle: await parent.getDirectoryHandle(name, { create: true }) };
    }
  }
  throw new Error("Could not reserve an export directory");
}

async function webWriter(rootName: string): Promise<FileTreeWriter | null> {
  const pickerWindow = window as DirectoryPickerWindow;
  if (typeof pickerWindow.showDirectoryPicker !== "function") {
    throw new FileTreeUnsupportedError();
  }
  let parent: BrowserDirectoryHandle;
  try { parent = await pickerWindow.showDirectoryPicker({ mode: "readwrite" }); }
  catch (error) { if (errorName(error) === "AbortError") return null; throw error; }
  const root = await uniqueDirectory(parent, rootName); let open = true;
  return {
    async write(path, blob) {
      if (!open || !path.length) throw new Error("Invalid directory export write");
      let directory = root.handle;
      for (const segment of path.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(segment, { create: true });
      }
      const fileName = path[path.length - 1]!;
      const file = await directory.getFileHandle(fileName, { create: true });
      const writable = await file.createWritable();
      await writable.write(blob); await writable.close();
    },
    async commit() { open = false; return { name: root.name, location: null }; },
    async abort() {
      if (!open) return; open = false;
      if (parent.removeEntry) {
        await parent.removeEntry(root.name, { recursive: true }).catch(() => undefined);
      }
    },
  };
}

export function createFileTreeWriter(rootName: string): Promise<FileTreeWriter | null> {
  const bridge = typeof window === "undefined" ? undefined : window.prodrawDesktop;
  return bridge?.fileTree ? desktopWriter(rootName, bridge) : webWriter(rootName);
}
