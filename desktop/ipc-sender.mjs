import { app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTrustedRendererUrl } from "./renderer-trust.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const packagedEntry = path.join(root, "..", "dist", "index.html");

export function assertTrustedIpcSender(event) {
  const candidate = event.senderFrame?.url ?? event.sender?.getURL?.() ?? "";
  const trusted = isTrustedRendererUrl(candidate, {
    packagedEntry,
    developmentUrl: app.isPackaged ? null : process.env.PRODRAW_DEV_URL ?? null
  });
  if (!trusted) throw new Error("Rejected IPC from an untrusted renderer");
}
