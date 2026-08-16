import { readdir, readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const main = await readFile("src/main.ts", "utf8");
const brushFiles = (await readdir("src/app-folders/brushes/main"))
  .filter((file) => file.endsWith(".brush"));
const errors = [];

if (!html.includes('src="/src/main.ts"')) {
  errors.push("index.html must boot the TypeScript raster entrypoint");
}
if (/src\/app\.js|id="cv"|pixelizer|tilemap/i.test(html)) {
  errors.push("production HTML still references the legacy pixel editor");
}
if (!main.includes("RasterEditorApp")) {
  errors.push("TypeScript entrypoint must create RasterEditorApp");
}
if (brushFiles.length !== 12) {
  errors.push(`expected 12 bundled .brush files, found ${brushFiles.length}`);
}

if (errors.length) {
  console.error(`Raster entry validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Raster entrypoint and bundled brush assets validated.");
