import { readFile } from "node:fs/promises";
import { productionGraph } from "./production-graph.mjs";
import { repositoryFiles } from "./repository-files.mjs";
import { cutoverErrors } from "./cutover-rules.mjs";

const config = JSON.parse(await readFile("project.config.json", "utf8"));
const cutover = config.cutover;
const html = await readFile("index.html", "utf8");
const files = await repositoryFiles();

const entries = [...html.matchAll(/<script\s+type="module"\s+src="([^"]+)"/g)]
  .map((match) => match[1].replace(/^\//, ""));

const graph = cutover ? await productionGraph(cutover.productionEntry) : new Set();
const sourceJavaScript = files.filter((file) => /^src\/.*\.js$/.test(file));
const legacyStateJavaScript = [];
for (const file of sourceJavaScript) {
  const source = await readFile(file, "utf8");
  if (/(?:\bS\.|\bgrid\b|\btilemap\b|pixelPatch|\.grid\b)/.test(source)) {
    legacyStateJavaScript.push(file);
  }
}
// grid[y][x] reads that still live on the production graph, in any language.
const INDEXED_READ = /(?:\bgrid|\bg|\bsrc|\brows?)\s*\[[^\]]+\]\s*\[/g;
let indexedGridReadCount = 0;
for (const file of graph) {
  if (!/^src\/.*\.(?:js|ts)$/.test(file)) continue;
  indexedGridReadCount += [...(await readFile(file, "utf8")).matchAll(INDEXED_READ)].length;
}
const errors = cutoverErrors({ cutover, entries, graph,
  sourceJavaScriptCount: sourceJavaScript.length,
  legacyStateJavaScriptCount: legacyStateJavaScript.length, indexedGridReadCount });

if (errors.length) {
  console.error(`Cutover validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`${cutover.runtimeMode} production graph validated at ${cutover.stage}: ` +
  `${graph.size} modules, ${sourceJavaScript.length} source JS, ` +
  `${legacyStateJavaScript.length} legacy-state JS, ` +
  `${indexedGridReadCount} indexed grid reads.`);
