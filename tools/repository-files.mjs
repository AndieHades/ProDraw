import { readdir } from "node:fs/promises";
import path from "node:path";

const ignored = new Set([".git", "dist", "node_modules"]);

export async function repositoryFiles(root = ".") {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else files.push(target.replaceAll("\\", "/"));
    }
  }
  await visit(root);
  return files.sort();
}
