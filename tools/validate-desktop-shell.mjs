import { access, readFile } from "node:fs/promises";

const required = [
  "desktop/electron-main.mjs",
  "desktop/desktop-smoke.mjs",
  "desktop/electron-preload.cjs",
  "desktop/electron-ipc.mjs",
  "desktop/brush-ipc.mjs",
  "desktop/ipc-channels.cjs",
  "src/contracts/platform.ts",
  "src/platform/createDesktopPlatform.ts",
  "src/app/runRendererSmoke.ts",
  "tools/smoke-packaged-desktop.mjs"
];
for (const file of required) await access(file);

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const main = await readFile("desktop/electron-main.mjs", "utf8");
const preload = await readFile("desktop/electron-preload.cjs", "utf8");
const channels = await readFile("desktop/ipc-channels.cjs", "utf8");
const desktopSmoke = await readFile("desktop/desktop-smoke.mjs", "utf8");
const rendererSmoke = await readFile("src/app/runRendererSmoke.ts", "utf8");
const packageSmoke = await readFile("tools/smoke-packaged-desktop.mjs", "utf8");
const html = await readFile("index.html", "utf8");
const errors = [];

if (pkg.main !== "desktop/electron-main.mjs") errors.push("package main must own Electron entry");
if (pkg.scripts?.["package:desktop"] !== "node tools/package-desktop.mjs") {
  errors.push("desktop package must use the verified packaging runner");
}
if (!main.includes("contextIsolation: true")) errors.push("contextIsolation must be enabled");
if (!main.includes("nodeIntegration: false")) errors.push("nodeIntegration must be disabled");
if (!main.includes("sandbox: true")) errors.push("renderer sandbox must be enabled");
if (!main.includes("app.isPackaged")) errors.push("development URL must be disabled when packaged");
if (!main.includes("await runPackagedSmoke")) errors.push("packaged smoke must await renderer proof");
if (!main.includes('query: { smoke: "1" }')) errors.push("packaged smoke must mark renderer URL");
if (!preload.includes("contextBridge.exposeInMainWorld")) errors.push("preload must expose an allowlisted bridge");
if (/remote\./.test(preload)) errors.push("preload must not use Electron remote");
if (/require\(["']\.\//.test(preload)) {
  errors.push("sandboxed preload cannot require project-local modules");
}
for (const [, channel] of channels.matchAll(/"(prodraw:[^"]+)"/g)) {
  if (!preload.includes(`"${channel}"`)) errors.push(`preload channel missing: ${channel}`);
}
if (!html.includes("Content-Security-Policy")) errors.push("renderer must define a content security policy");
for (const marker of ["executeJavaScript", "prodrawSmoke", "brushFiles", "alpha"]) {
  if (!desktopSmoke.includes(marker)) errors.push(`desktop smoke misses ${marker}`);
}
for (const marker of ["brushStorage", "renderBrushDab", "saveCurrent", "loadCurrent",
  "restoreDocument"]) {
  if (!rendererSmoke.includes(marker)) errors.push(`renderer smoke misses ${marker}`);
}
if (!packageSmoke.includes("--user-data-dir=")) {
  errors.push("packaged smoke must isolate the user-data profile");
}

if (errors.length) {
  console.error(`Desktop shell validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Desktop shell boundary and packaging metadata validated.");
