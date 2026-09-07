import assert from "node:assert/strict";
import { cutoverErrors } from "./cutover-rules.mjs";
import { importedSpecifiers } from "./production-graph.mjs";

const bridge = {
  stage: "C0", runtimeMode: "bridge", productionEntry: "src/legacy-entry.ts",
  targetEntry: "src/app/mountProductionShell.ts", maximumSourceJavaScriptFiles: 345,
  maximumLegacyStateJavaScriptFiles: 206, maximumIndexedGridReads: 10
};
const bridgeGraph = new Set(["src/legacy-entry.ts", "src/app.js", "src/main.ts"]);
const model = { cutover: bridge, entries: [bridge.productionEntry], graph: bridgeGraph,
  sourceJavaScriptCount: 345, legacyStateJavaScriptCount: 206,
  indexedGridReadCount: 10 };

assert.deepEqual(cutoverErrors(model), []);
assert.match(cutoverErrors({ ...model, entries: [bridge.targetEntry] }).join("\n"),
  /index must load only/);
assert.match(cutoverErrors({ ...model,
  graph: new Set([...bridgeGraph, bridge.targetEntry]) }).join("\n"), /must not be reported as live/);
assert.match(cutoverErrors({ ...model, sourceJavaScriptCount: 346 }).join("\n"), /grew to 346/);
assert.match(cutoverErrors({ ...model, indexedGridReadCount: 11 }).join("\n"),
  /indexed grid reads grew to 11/);
assert.deepEqual(cutoverErrors({ ...model, cutover: { ...bridge,
  maximumIndexedGridReads: undefined }, indexedGridReadCount: 999 }), []);

const target = { ...bridge, runtimeMode: "target", productionEntry: bridge.targetEntry,
  maximumSourceJavaScriptFiles: 0, maximumLegacyStateJavaScriptFiles: 0 };
assert.match(cutoverErrors({ cutover: target, entries: [target.targetEntry],
  graph: new Set([target.targetEntry, "src/old.js"]), sourceJavaScriptCount: 0,
  legacyStateJavaScriptCount: 0 }).join("\n"), /still imports JS/);

const imports = importedSpecifiers(`import './side.js';
  import type { Port } from "./port"; export { value } from './value';
  const optional = import('./optional.ts');`);
assert.deepEqual(imports.sort(), ["./optional.ts", "./port", "./side.js", "./value"]);
console.log("7 cutover rejection and graph fixtures passed.");
