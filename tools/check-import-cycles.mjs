import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { repositoryFiles } from "./repository-files.mjs";

const sourceFiles = (await repositoryFiles())
  .filter((file) => /^src\/.*\.tsx?$/.test(file));
const members = new Set(sourceFiles.map((file) => path.resolve(file)));
const graph = new Map();

async function resolveImport(owner, source) {
  if (!source.startsWith(".")) return null;
  const base = path.resolve(path.dirname(owner), source);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    try {
      await access(candidate);
      const target = path.resolve(candidate);
      return members.has(target) ? target : null;
    } catch { /* try next candidate */ }
  }
  return null;
}

for (const file of sourceFiles) {
  const absolute = path.resolve(file);
  const source = await readFile(file, "utf8");
  const dependencies = [];
  const pattern = /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const target = await resolveImport(absolute, match[1]);
    if (target) dependencies.push(target);
  }
  graph.set(absolute, dependencies);
}

const complete = new Set();
const active = new Map();
const stack = [];
let found;

function search(node) {
  if (found || complete.has(node)) return;
  const activeIndex = active.get(node);
  if (activeIndex !== undefined) {
    found = [...stack.slice(activeIndex), node];
    return;
  }
  active.set(node, stack.length);
  stack.push(node);
  for (const dependency of graph.get(node) ?? []) search(dependency);
  stack.pop();
  active.delete(node);
  complete.add(node);
}

for (const file of graph.keys()) search(file);
if (found) {
  console.error(`Import cycle:\n${found.map((file) => path.relative(".", file)).join(" -> ")}`);
  process.exit(1);
}
console.log(`No import cycles in ${sourceFiles.length} TypeScript source files.`);
