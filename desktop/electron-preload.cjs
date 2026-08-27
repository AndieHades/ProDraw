const { contextBridge, ipcRenderer } = require("electron");
// Sandboxed Electron preloads cannot require project-local modules.
const channels = {
  fileOpen: "prodraw:file:open",
  fileSave: "prodraw:file:save",
  fileWrite: "prodraw:file:write",
  fileConfirmDiscard: "prodraw:file:confirm-discard",
  exportTreeBegin: "prodraw:export-tree:begin",
  exportTreeEnsureDirectory: "prodraw:export-tree:ensure-directory",
  exportTreeWrite: "prodraw:export-tree:write",
  exportTreeCommit: "prodraw:export-tree:commit",
  exportTreeAbort: "prodraw:export-tree:abort",
  closeRequest: "prodraw:window:close-request",
  closeDecision: "prodraw:window:close-decision",
  brushSeed: "prodraw:brush:seed",
  brushList: "prodraw:brush:list",
  brushRead: "prodraw:brush:read",
  brushWrite: "prodraw:brush:write",
  brushTrash: "prodraw:brush:trash",
  brushCreateSet: "prodraw:brush:create-set",
  brushRenameSet: "prodraw:brush:rename-set",
  brushMove: "prodraw:brush:move",
  brushTrashSet: "prodraw:brush:trash-set",
  brushRestoreTrash: "prodraw:brush:restore-trash",
  brushRevealFolder: "prodraw:brush:reveal-folder",
  brushStateRead: "prodraw:brush:state-read",
  brushStateWrite: "prodraw:brush:state-write"
};

function arrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

contextBridge.exposeInMainWorld("prodrawDesktop", {
  platform: "windows",
  async openBinary(filters) {
    const result = await ipcRenderer.invoke(channels.fileOpen, filters ?? []);
    if (!result) return null;
    return { name: result.name, location: result.location, bytes: result.bytes };
  },
  async saveBinary(request) {
    return ipcRenderer.invoke(channels.fileSave, {
      suggestedName: request.suggestedName,
      filters: request.filters ?? [],
      bytes: request.bytes
    });
  },
  writeBinary(location, bytes) {
    return ipcRenderer.invoke(channels.fileWrite, { location, bytes });
  },
  confirmDiscard(request) {
    return ipcRenderer.invoke(channels.fileConfirmDiscard, request);
  },
  fileTree: {
    begin: (suggestedName) =>
      ipcRenderer.invoke(channels.exportTreeBegin, suggestedName),
    ensureDirectory: (token, relativePath) =>
      ipcRenderer.invoke(channels.exportTreeEnsureDirectory, token, relativePath),
    write: (token, relativePath, bytes) =>
      ipcRenderer.invoke(channels.exportTreeWrite, token, relativePath, bytes),
    commit: (token) => ipcRenderer.invoke(channels.exportTreeCommit, token),
    abort: (token) => ipcRenderer.invoke(channels.exportTreeAbort, token)
  },
  onCloseRequested(listener) {
    const handler = () => listener();
    ipcRenderer.on(channels.closeRequest, handler);
    return () => ipcRenderer.removeListener(channels.closeRequest, handler);
  },
  resolveCloseRequest(allow) {
    ipcRenderer.send(channels.closeDecision, Boolean(allow));
  },
  brushStorage: {
    ensureSeeded(setName, files) {
      return ipcRenderer.invoke(channels.brushSeed, { setName,
        files: files.map((file) => ({ fileName: file.fileName, bytes: file.bytes })) });
    },
    listSets: () => ipcRenderer.invoke(channels.brushList),
    async readFile(setName, fileName) {
      return arrayBuffer(await ipcRenderer.invoke(channels.brushRead,
        { setName, fileName }));
    },
    writeFile(setName, fileName, bytes) {
      return ipcRenderer.invoke(channels.brushWrite, { setName, fileName,
        bytes });
    },
    trashFile: (setName, fileName) =>
      ipcRenderer.invoke(channels.brushTrash, { setName, fileName }),
    createSet: (setName) => ipcRenderer.invoke(channels.brushCreateSet, setName),
    renameSet: (from, to) => ipcRenderer.invoke(channels.brushRenameSet, { from, to }),
    moveFile: (fromSet, toSet, fileName) =>
      ipcRenderer.invoke(channels.brushMove, { fromSet, toSet, fileName }),
    trashSet: (setName) => ipcRenderer.invoke(channels.brushTrashSet, setName),
    restoreTrash: () => ipcRenderer.invoke(channels.brushRestoreTrash),
    revealFolder: (setName) => ipcRenderer.invoke(channels.brushRevealFolder, setName),
    readState: () => ipcRenderer.invoke(channels.brushStateRead),
    writeState: (json) => ipcRenderer.invoke(channels.brushStateWrite, json)
  }
});
