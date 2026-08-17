import { readFile } from "node:fs/promises";
import { productionGraph } from "./production-graph.mjs";

const actionCatalog = catalogValues(await readFile(
  "src/contracts/shellActionCatalog.ts", "utf8"));
const eventCatalog = catalogValues(await readFile(
  "src/contracts/shellEventCatalog.ts", "utf8"));
const config = JSON.parse(await readFile("project.config.json", "utf8"));
const files = [...await productionGraph(config.cutover.productionEntry)].filter((file) =>
  /^src\/.*\.(?:js|ts)$/.test(file));
const errors = [];
const registrations = new Map();

function catalogValues(source) {
  const values = [...source.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const unique = new Set(values);
  if (values.length !== unique.size) throw new Error("Shell catalog contains duplicates");
  return unique;
}

function checkKnown(kind, catalog, name, file) {
  if (!name.endsWith(".") && !catalog.has(name)) {
    errors.push(`${file}: unknown ${kind} ${name}`);
  }
}

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(
    /actions\.(register|replace|run)\(\s*['"]([^'"]+)['"]/g)) {
    const [, operation, name] = match;
    checkKnown("action", actionCatalog, name, file);
    if (operation === "register" && !name.endsWith(".")) {
      const owners = registrations.get(name) ?? [];
      owners.push(file);
      registrations.set(name, owners);
    }
  }
  for (const match of source.matchAll(/bus\.(?:on|emit)\(\s*['"]([^'"]+)['"]/g)) {
    checkKnown("event", eventCatalog, match[1], file);
  }
}

for (const [name, owners] of registrations) {
  if (owners.length > 1) errors.push(`action ${name} has multiple owners: ${owners.join(", ")}`);
}
if (errors.length) {
  console.error(`Shell catalog validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`${actionCatalog.size} shell actions and ${eventCatalog.size} events validated ` +
  `across ${files.length} live modules.`);
