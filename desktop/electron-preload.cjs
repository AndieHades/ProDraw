const { contextBridge, ipcRenderer } = require("electron");

const channels = {
  open: "prodraw:file:open",
  save: "prodraw:file:save"
};

contextBridge.exposeInMainWorld("prodrawDesktop", {
  platform: "windows",
  async openBinary(filters) {
    const result = await ipcRenderer.invoke(channels.open, filters ?? []);
    if (!result) return null;
    return { name: result.name, bytes: Uint8Array.from(result.bytes).buffer };
  },
  async saveBinary(request) {
    return ipcRenderer.invoke(channels.save, {
      suggestedName: request.suggestedName,
      filters: request.filters ?? [],
      bytes: Array.from(new Uint8Array(request.bytes))
    });
  }
});
