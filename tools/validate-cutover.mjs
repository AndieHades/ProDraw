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
const errors = cutoverErrors({ cutover, entries, graph,
  sourceJavaScriptCount: sourceJavaScript.length,
  legacyStateJavaScriptCount: legacyStateJavaScript.length });

if (errors.length) {
  console.error(`Cutover validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`${cutover.runtimeMode} production graph validated at ${cutover.stage}: ` +
  `${graph.size} modules, ${sourceJavaScript.length} source JS, ` +
  `${legacyStateJavaScript.length} legacy-state JS.`);
