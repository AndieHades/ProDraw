const { contextBridge, ipcRenderer } = require("electron");
// Sandboxed Electron preloads cannot require project-local modules.
const channels = {
  fileOpen: "prodraw:file:open",
  fileSave: "prodraw:file:save",
  brushSeed: "prodraw:brush:seed",
  brushList: "prodraw:brush:list",
  brushRead: "prodraw:brush:read",
  brushWrite: "prodraw:brush:write",
  brushTrash: "prodraw:brush:trash",
  brushCreateSet: "prodraw:brush:create-set",
  brushRenameSet: "prodraw:brush:rename-set",
  brushMove: "prodraw:brush:move"
};

contextBridge.exposeInMainWorld("prodrawDesktop", {
  platform: "windows",
  async openBinary(filters) {
    const result = await ipcRenderer.invoke(channels.fileOpen, filters ?? []);
    if (!result) return null;
    return { name: result.name, bytes: Uint8Array.from(result.bytes).buffer };
  },
  async saveBinary(request) {
    return ipcRenderer.invoke(channels.fileSave, {
      suggestedName: request.suggestedName,
      filters: request.filters ?? [],
      bytes: Array.from(new Uint8Array(request.bytes))
    });
  },
  brushStorage: {
    ensureSeeded(setName, files) {
      return ipcRenderer.invoke(channels.brushSeed, { setName,
        files: files.map((file) => ({ fileName: file.fileName,
          bytes: Array.from(new Uint8Array(file.bytes)) })) });
    },
    listSets: () => ipcRenderer.invoke(channels.brushList),
    async readFile(setName, fileName) {
      return Uint8Array.from(await ipcRenderer.invoke(channels.brushRead,
        { setName, fileName })).buffer;
    },
    writeFile(setName, fileName, bytes) {
      return ipcRenderer.invoke(channels.brushWrite, { setName, fileName,
        bytes: Array.from(new Uint8Array(bytes)) });
    },
    trashFile: (setName, fileName) =>
      ipcRenderer.invoke(channels.brushTrash, { setName, fileName }),
    createSet: (setName) => ipcRenderer.invoke(channels.brushCreateSet, setName),
    renameSet: (from, to) => ipcRenderer.invoke(channels.brushRenameSet, { from, to }),
    moveFile: (fromSet, toSet, fileName) =>
      ipcRenderer.invoke(channels.brushMove, { fromSet, toSet, fileName })
  }
});
