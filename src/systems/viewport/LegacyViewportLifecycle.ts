import * as bus from "../../core/bus.ts";

export function mountLegacyViewportLifecycle(fit: () => void): void {
  bus.on("document-transition", fit);
  window.addEventListener("pagehide", fit);
}
