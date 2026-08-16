import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerFileIpc } from "./electron-ipc.mjs";
import { registerBrushIpc } from "./brush-ipc.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const smokeOnly = process.argv.includes("--smoke-test");

function createWindow() {
  const developmentUrl = process.env.PRODRAW_DEV_URL;
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#16171a",
    show: false,
    webPreferences: {
      preload: path.join(root, "electron-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    const allowedDevelopment = developmentUrl && url.startsWith(developmentUrl);
    if (!url.startsWith("file:") && !allowedDevelopment) event.preventDefault();
  });
  window.once("ready-to-show", () => window.show());
  if (developmentUrl) void window.loadURL(developmentUrl);
  else void window.loadFile(path.join(root, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  if (smokeOnly) {
    process.stdout.write(`ProDraw desktop ${app.getVersion()}\n`);
    app.quit();
    return;
  }
  registerFileIpc();
  registerBrushIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => app.quit());
