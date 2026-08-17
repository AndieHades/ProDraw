import { access, readFile } from "node:fs/promises";
import path from "node:path";

const staticPattern = /(?:import|export)\s+(?:type\s+)?(?:[^;"']*?\sfrom\s*)?["']([^"']+)["']/g;
const dynamicPattern = /import\(\s*["']([^"']+)["']\s*\)/g;
const sourceExtensions = [".ts", ".js", ".mjs", ".cjs"];

const normalize = (file) => file.replaceAll("\\", "/").replace(/^\.\//, "");

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

async function resolveSource(owner, specifier, root) {
  if (!specifier.startsWith(".")) return null;
  const unresolved = path.resolve(root, path.dirname(owner), specifier);
  const candidates = path.extname(unresolved) ? [unresolved] : [
    ...sourceExtensions.map((extension) => unresolved + extension),
    ...sourceExtensions.map((extension) => path.join(unresolved, `index${extension}`))
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return normalize(path.relative(root, candidate));
  }
  return null;
}

export function importedSpecifiers(source) {
  return [
    ...[...source.matchAll(staticPattern)].map((match) => match[1]),
    ...[...source.matchAll(dynamicPattern)].map((match) => match[1])
  ];
}

export async function productionGraph(entry, root = process.cwd()) {
  const pending = [normalize(entry)];
  const visited = new Set();
  while (pending.length) {
    const owner = pending.pop();
    if (!owner || visited.has(owner)) continue;
    visited.add(owner);
    const source = await readFile(path.resolve(root, owner), "utf8");
    for (const specifier of importedSpecifiers(source)) {
      const target = await resolveSource(owner, specifier, root);
      if (target && !visited.has(target)) pending.push(target);
    }
  }
  return visited;
}
