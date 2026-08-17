import { ipcMain } from "electron";
import { assertTrustedIpcSender } from "./ipc-sender.mjs";

export function handleTrusted(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedIpcSender(event);
    return handler(event, ...args);
  });
}

export function onTrusted(channel, handler) {
  ipcMain.on(channel, (event, ...args) => {
    assertTrustedIpcSender(event);
    handler(event, ...args);
  });
}
