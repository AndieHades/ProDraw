import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dialog, ipcMain } from "electron";
import channels from "./ipc-channels.cjs";


function electronFilters(filters = []) {
  return filters.map((filter) => ({
    name: String(filter.name),
    extensions: filter.extensions.map((extension) => String(extension).replace(/^\./, ""))
  }));
}

export function registerFileIpc() {
  ipcMain.handle(channels.fileOpen, async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: electronFilters(filters)
    });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) return null;
    const bytes = await readFile(filePath);
    return { name: path.basename(filePath), bytes: Array.from(bytes) };
  });

  ipcMain.handle(channels.fileSave, async (_event, request) => {
    const result = await dialog.showSaveDialog({
      defaultPath: String(request.suggestedName),
      filters: electronFilters(request.filters)
    });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, Buffer.from(request.bytes));
    return true;
  });
}

export const fileChannels = { open: channels.fileOpen, save: channels.fileSave };
