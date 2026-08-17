import { runNpmScripts } from "./command-runner.mjs";
import { repositoryChangedFiles } from "./changed-files.mjs";

const changed = repositoryChangedFiles();
const docsOnly = changed.length > 0 && changed.every((file) =>
  file.endsWith(".md") || file === "AGENTS.md" || file === "CLAUDE.md" ||
  file.startsWith(".claude/") || file.startsWith(".codex/"));

if (docsOnly) await runNpmScripts(["validate:docs", "validate:hooks", "validate:lines"]);
else await runNpmScripts([
  "check", "lint", "test:ts", "validate:docs", "validate:hooks", "validate:lines",
  "validate:architecture", "validate:cycles", "validate:cutover", "validate:desktop",
  "validate:raster-entry", "validate:shell-catalog"
]);
console.log(`Changed-surface validation passed for ${changed.length} files.`);
