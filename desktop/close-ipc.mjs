import channels from "./ipc-channels.cjs";
import { onTrusted } from "./trusted-ipc.mjs";
import { createCloseHandshake } from "./close-handshake.mjs";
import { confirmInWindow } from "./confirm-dialog.mjs";

const handshakes = new Map();

export function registerCloseIpc() {
  onTrusted(channels.closeAck, (event) => handshakes.get(event.sender.id)?.acknowledge());
  onTrusted(channels.closeDecision, (event, decision) =>
    handshakes.get(event.sender.id)?.decide(decision));
}

export function attachCloseHandshake(window, limits) {
  const contents = window.webContents, webContentsId = contents.id;
  const handshake = createCloseHandshake({
    send: () => contents.send(channels.closeRequest),
    // destroy() skips beforeunload, so an approved close cannot be held up
    // by a renderer that stopped responding.
    destroy: () => { if (!window.isDestroyed()) window.destroy(); },
    rendererGone: () => contents.isDestroyed() || contents.isCrashed(),
    confirm: (prompt) => confirmInWindow(window, prompt),
    setTimer: (callback, ms) => setTimeout(callback, ms),
    clearTimer: (timer) => clearTimeout(timer)
  }, limits);
  handshakes.set(webContentsId, handshake);
  window.on("close", (event) => {
    event.preventDefault();
    handshake.request();
  });
  window.on("closed", () => {
    handshake.dispose();
    handshakes.delete(webContentsId);
  });
}
