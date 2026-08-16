const { contextBridge, ipcRenderer } = require("electron");
// Sandboxed Electron preloads cannot require project-local modules.
const channels = {
  fileOpen: "prodraw:file:open",
  fileSave: "prodraw:file:save",
  fileWrite: "prodraw:file:write",
  fileConfirmDiscard: "prodraw:file:confirm-discard",
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
  brushStateRead: "prodraw:brush:state-read",
  brushStateWrite: "prodraw:brush:state-write"
};

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
      ipcRenderer.invoke(channels.brushMove, { fromSet, toSet, fileName }),
    trashSet: (setName) => ipcRenderer.invoke(channels.brushTrashSet, setName),
    readState: () => ipcRenderer.invoke(channels.brushStateRead),
    writeState: (json) => ipcRenderer.invoke(channels.brushStateWrite, json)
  }
});
