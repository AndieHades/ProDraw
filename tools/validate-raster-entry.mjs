import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
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
// The cutover target is the TypeScript root that mounts the preserved shell.
// RasterEditorApp is not that root: it requires a brush library to construct and
// handles about fifteen commands, so it cannot own PSD, gallery, folders,
// selection, transform, crop, trim, text, animation or effects. The target file
// itself arrives in stage Q6; until then only the declaration is checked. See
// docs/tutorials/raster-quality-runtime/01-current-state.md.
const target = projectConfig.cutover.targetEntry;
if (!/^src\/.+\.ts$/.test(target)) {
  errors.push("cutover target must be a TypeScript module under src");
}
for (const retired of ["src/raster-main.ts", "src/main.ts"]) {
  if (target === retired) errors.push(`cutover target must not be the detached editor ${retired}`);
}
if (target === projectConfig.cutover.productionEntry &&
    projectConfig.cutover.runtimeMode === "shell") {
  errors.push("shell mode target must differ from the current production entry");
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
console.log(`Configured shell entry validated; cutover target is ${target}.`);
