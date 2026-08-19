import { readdir, readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const main = await readFile("src/main.ts", "utf8");
const rasterMain = await readFile("src/raster-main.ts", "utf8");
const rasterConfig = await readFile("src/config/raster.ts", "utf8");
const projectConfig = JSON.parse(await readFile("project.config.json", "utf8"));
const bridge = await readFile(projectConfig.cutover.productionEntry, "utf8");
const brushFiles = (await readdir("src/app-folders/brushes/main"))
  .filter((file) => file.endsWith(".brush"));
const errors = [];

if (!html.includes(`src="/${projectConfig.cutover.productionEntry}"`)) {
  errors.push("index.html must boot the configured production entry");
}
if (!bridge.includes("import './app.js'") || !bridge.includes("from './main.ts'")) {
  errors.push("migration bridge must join the original shell to typed brush owners");
}
if (!main.includes("mountCompactBrushLibrary")) {
  errors.push("TypeScript entrypoint must expose the compact brush integration");
}
if (!rasterMain.includes("RasterEditorApp") ||
    !rasterMain.includes("bootstrapRasterEditor")) {
  errors.push("detached TypeScript raster bootstrap must remain available for cutover");
}
if (brushFiles.length !== 12) {
  errors.push(`expected 12 bundled .brush files, found ${brushFiles.length}`);
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
console.log("Configured migration entry, detached target and bundled brush assets validated.");
