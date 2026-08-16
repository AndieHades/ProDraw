import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerFileIpc } from "./electron-ipc.mjs";
import { registerBrushIpc } from "./brush-ipc.mjs";
import { runPackagedSmoke } from "./desktop-smoke.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const smokeOnly = process.argv.includes("--smoke-test");

function developmentLocation() {
  if (app.isPackaged || !process.env.PRODRAW_DEV_URL) return null;
  const location = new URL(process.env.PRODRAW_DEV_URL);
  if (!new Set(["http:", "https:"]).has(location.protocol)) {
    throw new Error("PRODRAW_DEV_URL must use HTTP(S)");
  }
  return location;
}

async function createWindow({ smoke = false } = {}) {
  const developmentUrl = developmentLocation();
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
    let allowedDevelopment = false;
    try { allowedDevelopment = developmentUrl?.origin === new URL(url).origin; }
    catch { /* Invalid navigation is denied below. */ }
    if (!url.startsWith("file:") && !allowedDevelopment) event.preventDefault();
  });
  if (!smoke) window.once("ready-to-show", () => window.show());
  if (developmentUrl) await window.loadURL(developmentUrl.href);
  else await window.loadFile(path.join(root, "..", "dist", "index.html"),
    smoke ? { query: { smoke: "1" } } : undefined);
  return window;
}

async function start() {
  registerFileIpc();
  registerBrushIpc();
  if (smokeOnly) {
    const window = await createWindow({ smoke: true });
    await runPackagedSmoke(window);
    app.exit(0);
    return;
  }
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
}

void app.whenReady().then(start).catch((error) => {
  console.error("ProDraw desktop startup failed", error);
  app.exit(1);
});

app.on("window-all-closed", () => app.quit());
