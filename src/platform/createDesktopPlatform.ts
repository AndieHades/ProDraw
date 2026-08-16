import type { DesktopBridge, PlatformPort } from "../contracts/platform";

export function createDesktopPlatform(bridge: DesktopBridge): PlatformPort {
  return {
    kind: "windows",
    brushStorage: {
      ensureSeeded: (setName, files) => bridge.brushStorage.ensureSeeded(setName,
        files.map((file) => ({ fileName: file.fileName, bytes: file.bytes.buffer }))),
      listSets: () => bridge.brushStorage.listSets(),
      async readFile(setName, fileName) {
        return new Uint8Array(await bridge.brushStorage.readFile(setName, fileName));
      },
      writeFile: (setName, fileName, bytes) =>
        bridge.brushStorage.writeFile(setName, fileName, bytes.buffer),
      trashFile: (setName, fileName) => bridge.brushStorage.trashFile(setName, fileName),
      createSet: (setName) => bridge.brushStorage.createSet(setName),
      renameSet: (from, to) => bridge.brushStorage.renameSet(from, to),
      moveFile: (fromSet, toSet, fileName) =>
        bridge.brushStorage.moveFile(fromSet, toSet, fileName)
    },
    async openBinary(filters) {
      const opened = await bridge.openBinary(filters);
      if (!opened) return null;
      return { name: opened.name, bytes: new Uint8Array(opened.bytes) };
    },
    async saveBinary(request) {
      return bridge.saveBinary({
        suggestedName: request.suggestedName,
        bytes: request.bytes.buffer,
        ...(request.filters ? { filters: request.filters } : {})
      });
    }
  };
}
