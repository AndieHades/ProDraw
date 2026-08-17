import { readFile } from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import { atomicWriteFile } from "./atomic-file.mjs";
import channels from "./ipc-channels.cjs";
import { handleTrusted } from "./trusted-ipc.mjs";

let lastDirectory = null;

function electronFilters(filters = []) {
  return filters.map((filter) => ({ name: String(filter.name),
    extensions: filter.extensions.map((extension) =>
      String(extension).replace(/^\./, "")) }));
}

function parentWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function defaultPath(suggestedName) {
  const directory = lastDirectory ?? app.getPath("documents");
  return path.join(directory, path.basename(String(suggestedName)));
}

function nativeDocumentLocation(value) {
  const location = path.resolve(String(value));
  if (path.extname(location).toLowerCase() !== ".prodraw") {
    throw new Error("Existing writes require a .prodraw document path");
  }
  return location;
}

export function registerFileIpc() {
  handleTrusted(channels.fileOpen, async (event, filters) => {
    const result = await dialog.showOpenDialog(parentWindow(event), {
      properties: ["openFile"], filters: electronFilters(filters),
      defaultPath: lastDirectory ?? app.getPath("documents")
    });
    const location = result.filePaths[0];
    if (result.canceled || !location) return null;
    lastDirectory = path.dirname(location);
    const bytes = await readFile(location);
    return { name: path.basename(location), location,
      bytes: Uint8Array.from(bytes).buffer };
  });

  handleTrusted(channels.fileSave, async (event, request) => {
    const result = await dialog.showSaveDialog(parentWindow(event), {
      defaultPath: defaultPath(request.suggestedName),
      filters: electronFilters(request.filters)
    });
    if (result.canceled || !result.filePath) return null;
    await atomicWriteFile(result.filePath, request.bytes);
    lastDirectory = path.dirname(result.filePath);
    return { name: path.basename(result.filePath), location: result.filePath };
  });

  handleTrusted(channels.fileWrite, async (_event, request) => {
    await atomicWriteFile(nativeDocumentLocation(request.location), request.bytes);
    lastDirectory = path.dirname(request.location);
    return true;
  });

  handleTrusted(channels.fileConfirmDiscard, async (event, request) => {
    const result = await dialog.showMessageBox(parentWindow(event), {
      type: "warning", title: String(request.title), message: String(request.message),
      buttons: [String(request.confirmLabel), String(request.cancelLabel)],
      defaultId: 1, cancelId: 1, noLink: true
    });
    return result.response === 0;
  });
}

export const fileChannels = { open: channels.fileOpen, save: channels.fileSave };
