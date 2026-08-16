import { readFile } from "node:fs/promises";
import { repositoryFiles } from "./repository-files.mjs";

const config = JSON.parse(await readFile("project.config.json", "utf8"));
const files = await repositoryFiles();
const errors = [];
const legacyDocs = new Set(config.legacyDocsOverLimit ?? []);

function lineCount(source) {
  const trailing = /(?:\r\n|\r|\n)$/.test(source) ? 1 : 0;
  return source.split(/\r\n|\r|\n/).length - trailing;
}

function isNewCode(file) {
  if (/^src\/.*\.tsx?$/.test(file)) return true;
  if (/^src\/styles\/raster-.*\.css$/.test(file)) return true;
  if (/^(desktop|tools)\/.*\.(cjs|mjs|tsx?)$/.test(file)) return true;
  if (/^\.claude\/hooks\/.*\.mjs$/.test(file)) return true;
  return /^(eslint|vite)\.config\.(js|mjs|ts)$/.test(file);
}

for (const file of files) {
  let limit;
  if (isNewCode(file)) limit = config.lineLimit;
  if (file.endsWith(".md") && !file.startsWith("docs/tutorials/") &&
      !legacyDocs.has(file)) limit = config.docsLineLimit;
  if (!limit) continue;
  const count = lineCount(await readFile(file, "utf8"));
  if (count > limit) errors.push(`${file}: ${count} lines (max ${limit})`);
}

if (errors.length) {
  console.error(`Line limit violations:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Line limits passed for governed code and documentation.");
