import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const rasterMain = await readFile("src/raster-main.ts", "utf8");
const rasterConfig = await readFile("src/config/raster.ts", "utf8");
const projectConfig = JSON.parse(await readFile("project.config.json", "utf8"));
const bridge = await readFile(projectConfig.cutover.productionEntry, "utf8");
const errors = [];

if (!html.includes(`src="/${projectConfig.cutover.productionEntry}"`)) {
  errors.push("index.html must boot the configured production entry");
}
if (!bridge.includes("import './app.js'")) {
  errors.push("production entry must start the preserved shell");
}
if (projectConfig.cutover.runtimeMode === "shell" && bridge.includes("./main.ts")) {
  errors.push("shell entry must not load the detached typed brush runtime");
}
if (!rasterMain.includes("RasterEditorApp") || !rasterMain.includes("bootstrapRasterEditor")) {
  errors.push("detached TypeScript raster bootstrap must remain available for cutover");
}
const runtimeMaximum = rasterConfig.match(/maximumPixels:\s*([\d_]+)/)?.[1];
if (!runtimeMaximum || Number(runtimeMaximum.replaceAll("_", "")) !==
    projectConfig.maxCanvasPixels) {
  errors.push("project and runtime maximum canvas pixels must match");
}

if (errors.length) {
  console.error(`Raster entry validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Configured shell entry and detached raster target validated.");
