import { execFileSync } from "node:child_process";
import { runNpmScripts } from "./command-runner.mjs";

const changed = execFileSync("git", ["diff", "--name-only", "HEAD"],
  { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const docsOnly = changed.length > 0 && changed.every((file) =>
  file.endsWith(".md") || file === "AGENTS.md" || file === "CLAUDE.md" ||
  file.startsWith(".claude/") || file === "project.config.json");

if (docsOnly) await runNpmScripts(["validate:docs", "validate:lines"]);
else await runNpmScripts([
  "check", "lint", "test:ts", "validate:docs", "validate:lines",
  "validate:architecture", "validate:cycles", "validate:desktop"
]);
console.log(`Changed-surface validation passed for ${changed.length} files.`);
