import { readFile } from "node:fs/promises";
import { repositoryFiles } from "./repository-files.mjs";

const config = JSON.parse(await readFile("project.config.json", "utf8"));
const files = await repositoryFiles();
const errors = [];
const legacyDocs = new Set(config.legacyDocsOverLimit ?? []);
const legacyCode = new Set(config.legacyCodeOverLimit ?? []);
const usedLegacyDocs = new Set();
const usedLegacyCode = new Set();

function lineCount(source) {
  const trailing = /(?:\r\n|\r|\n)$/.test(source) ? 1 : 0;
  return source.split(/\r\n|\r|\n/).length - trailing;
}

function isWorkingCode(file) {
  if (/^(src|tests|test|desktop|tools|public)\/.*\.(cjs|mjs|js|jsx|ts|tsx|css)$/.test(file)) {
    return true;
  }
  if (/^\.(claude|codex)\/hooks\/.*\.(mjs|js|sh)$/.test(file)) return true;
  return /^(?:package\.json|project\.config\.json|tsconfig\.json|[^/]+\.config\.(js|mjs|ts))$/.test(file);
}

for (const file of files) {
  let limit;
  if (isWorkingCode(file)) limit = config.lineLimit;
  if (file.endsWith(".md")) limit = config.docsLineLimit;
  if (!limit) continue;
  const count = lineCount(await readFile(file, "utf8"));
  if (count > limit && legacyCode.has(file)) { usedLegacyCode.add(file); continue; }
  if (count > limit && legacyDocs.has(file)) { usedLegacyDocs.add(file); continue; }
  if (count > limit) errors.push(`${file}: ${count} lines (max ${limit})`);
}

for (const file of legacyCode) {
  if (!usedLegacyCode.has(file)) errors.push(`${file}: stale legacy code line exemption`);
}
for (const file of legacyDocs) {
  if (!usedLegacyDocs.has(file)) errors.push(`${file}: stale legacy docs line exemption`);
}

if (errors.length) {
  console.error(`Line limit violations:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Line limits passed for governed code and documentation.");
