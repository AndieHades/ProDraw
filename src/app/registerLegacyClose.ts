import type { PlatformPort } from "../contracts/platform";

export function registerLegacyClose(platform: PlatformPort,
  saveCurrent: () => Promise<boolean>): () => void {
  if (platform.kind !== "windows") return () => undefined;
  return platform.onCloseRequested(async () => {
    try { return await saveCurrent(); }
    catch { return false; }
  });
}
