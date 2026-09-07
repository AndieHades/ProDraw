import type { DesktopBridge } from "../contracts/platform";

export function registerLegacyClose(
  bridge: DesktopBridge | undefined,
  saveCurrent: () => Promise<boolean>
): () => void {
  if (!bridge) return () => undefined;
  return bridge.onCloseRequested(() => {
    void saveCurrent().then(
      (allow) => bridge.resolveCloseRequest(allow),
      () => bridge.resolveCloseRequest(false)
    );
  });
}
