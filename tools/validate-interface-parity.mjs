import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const styles = await readFile("src/styles/app.css", "utf8");
const app = await readFile("src/app.js", "utf8");
const layout = await readFile("src/ui/shell/PreservedShellLayout.ts", "utf8");
const layers = await readFile("src/systems/layers/index.js", "utf8");
const layerList = await readFile("src/systems/layers/list.js", "utf8");
const panels = await readFile("src/ui/shell/PanelOrderPresenter.ts", "utf8");
const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
const errors = [];

const requiredIds = [
  "cv", "topbar", "sidebar", "sb-grip", "sb-rsz", "brushbar",
  "brush-pop", "brush-head", "brush-list", "brush-rsz", "brush-menu",
  "bp-size-sl", "bp-op-sl", "palbar", "palgrip", "pal", "palrsz",
  "lay-pop", "lay-head", "lay-list", "lay-rsz", "col-disc",
  "gallery", "gal-top", "gal-grid", "refwin", "refgrip", "refcv", "refrsz"
];
const forbiddenReplacementIds = ["paint-canvas", "drawing-tool-panel", "layers-panel"];
const requiredStyleParts = [
  "topbar.css", "sidebar.css", "palette-window.css", "layers-panel.css",
  "brushbar-eyedropper.css", "gallery.css", "shading-reference.css"
];
const expectedSidebarOrder = ["t-pencil", "t-eraser", "t-smudge", "t-fill",
  "t-move", "crop", "t-select", "t-lasso", "flip-h", "sym", "t-shape",
  "t-adjust", "tile-btn", "center", "t-text", "zoom"];

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) errors.push(`original interface is missing #${id}`);
}
if (!html.includes('<body class="gallery-open">') ||
    !html.includes('<div id="gallery" class="on">')) {
  errors.push("gallery must cover the editor from the first rendered frame");
}
if (!html.includes('<span id="gal-title">ProDraw</span>') ||
    manifest.name !== "ProDraw" || manifest.short_name !== "ProDraw") {
  errors.push("visible gallery and install manifest identity must be ProDraw");
}
for (const id of forbiddenReplacementIds) {
  if (html.includes(`id="${id}"`)) errors.push(`replacement shell #${id} is forbidden`);
}
for (const id of ["new-digital", "new-print-social"]) {
  if (!html.includes(`id="${id}"`)) errors.push(`canvas preset shell is missing #${id}`);
}
for (const marker of ["new-sprites", "new-frames", "new.sprites", "new.gameFrames"]) {
  if (html.includes(marker)) errors.push(`obsolete pixel preset marker remains: ${marker}`);
}
for (const part of requiredStyleParts) {
  if (!styles.includes(part)) errors.push(`original CSS part is missing: ${part}`);
}
if (!app.includes("mountPreservedShellLayout") ||
    !layout.includes('element("palbar")') || !layout.includes('element("sidebar")')) {
  errors.push("palette and brush controls must keep floating-window behavior");
}
if (!layers.includes("floatingWindow($('lay-pop')") || !layerList.includes("dragRow(")) {
  errors.push("layers must keep floating resize and row drag/drop behavior");
}
if (!panels.includes("attachReorder(")) {
  errors.push("tool panels must keep button drag/reorder behavior");
}
const sidebar = html.match(/<aside id="sidebar">([\s\S]*?)<\/aside>/)?.[1] ?? "";
const sidebarOrder = [...sidebar.matchAll(/<button id="([^"]+)"/g)]
  .map((match) => match[1]);
if (JSON.stringify(sidebarOrder) !== JSON.stringify(expectedSidebarOrder)) {
  errors.push(`sidebar order must be ${expectedSidebarOrder.join(", ")}`);
}
for (const retired of ["pp", "stab"]) {
  if (sidebar.includes(`id="${retired}"`)) errors.push(`#${retired} is retired from sidebar`);
}
if (!panels.includes("panelOrderV2") || !panels.includes('"t-smudge"') ||
    !panels.includes('"t-text"')) {
  errors.push("movable two-column sidebar must persist Smudge and Text order");
}
for (const owner of ["layersUI", "gallery", "reference"]) {
  if (!app.includes(owner)) errors.push(`original runtime owner is missing: ${owner}`);
}
const brushActions = [...html.matchAll(/data-act="(edit|duplicate|delete)"/g)]
  .map((match) => match[1]);
if (!brushActions.includes("edit") || !brushActions.includes("duplicate") ||
    !brushActions.includes("delete")) {
  errors.push("compact brush menu must expose Edit, Duplicate and Delete");
}
if (html.includes('id="brush-library-dialog"') || html.includes('id="brush-settings"')) {
  errors.push("replacement brush library and retired settings panel must stay absent");
}

if (errors.length) {
  console.error(`Original interface parity validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Original interface shell and drag/drop contracts validated.");
