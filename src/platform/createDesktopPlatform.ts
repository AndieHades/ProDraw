import type { DesktopBridge, PlatformPort } from "../contracts/platform";
import type { BrushDecoderPort } from "../contracts/brushDecoder";

export function createDesktopPlatform(
  bridge: DesktopBridge,
  brushDecoder: BrushDecoderPort
): PlatformPort {
  return {
    kind: "windows",
    brushDecoder,
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
        bridge.brushStorage.moveFile(fromSet, toSet, fileName),
      trashSet: (setName) => bridge.brushStorage.trashSet(setName),
      restoreTrash: () => bridge.brushStorage.restoreTrash(),
      revealFolder: (setName) => bridge.brushStorage.revealFolder(setName),
      readState: () => bridge.brushStorage.readState(),
      writeState: (json) => bridge.brushStorage.writeState(json)
    },
    async openBinary(filters) {
      const opened = await bridge.openBinary(filters);
      if (!opened) return null;
      return { name: opened.name, bytes: new Uint8Array(opened.bytes),
        location: opened.location };
    },
    async saveBinary(request) {
      return bridge.saveBinary({
        suggestedName: request.suggestedName,
        bytes: request.bytes.buffer,
        ...(request.filters ? { filters: request.filters } : {})
      });
    },
    writeBinary: (location, bytes) => bridge.writeBinary(location, bytes.buffer),
    confirmDiscard: (request) => bridge.confirmDiscard(request),
    onCloseRequested(handler) {
      return bridge.onCloseRequested(() => {
        void handler().then((allow) => bridge.resolveCloseRequest(allow),
          () => bridge.resolveCloseRequest(false));
      });
    }
  };
}
