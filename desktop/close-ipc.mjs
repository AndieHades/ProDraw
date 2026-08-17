import channels from "./ipc-channels.cjs";
import { onTrusted } from "./trusted-ipc.mjs";

const pending = new Map();

export function registerCloseIpc() {
  onTrusted(channels.closeDecision, (event, allow) => {
    const request = pending.get(event.sender.id);
    if (!request) return;
    pending.delete(event.sender.id);
    clearTimeout(request.timer);
    request.finish(Boolean(allow));
  });
}

export function attachCloseHandshake(window, timeoutMs = 5_000) {
  let approved = false;
  const webContentsId = window.webContents.id;
  window.on("close", (event) => {
    if (approved || window.isDestroyed()) return;
    event.preventDefault();
    if (pending.has(webContentsId)) return;
    const finish = (allow) => {
      if (!allow || window.isDestroyed()) return;
      approved = true;
      window.close();
    };
    const timer = setTimeout(() => {
      pending.delete(webContentsId);
      finish(true);
    }, timeoutMs);
    pending.set(webContentsId, { finish, timer });
    window.webContents.send(channels.closeRequest);
  });
  window.on("closed", () => {
    const request = pending.get(webContentsId);
    if (request) clearTimeout(request.timer);
    pending.delete(webContentsId);
  });
}
