import type { DesktopBridge, PlatformPort } from "../contracts/platform";

export function createDesktopPlatform(bridge: DesktopBridge): PlatformPort {
  return {
    kind: "windows",
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
