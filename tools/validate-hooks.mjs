import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const configPaths = [".claude/settings.json", ".codex/hooks.json"];
const errors = [];

function commands(value, output = []) {
  if (Array.isArray(value)) for (const item of value) commands(item, output);
  else if (value && typeof value === "object") {
    if (typeof value.command === "string") output.push(value.command);
    for (const nested of Object.values(value)) commands(nested, output);
  }
  return output;
}

const configs = await Promise.all(configPaths.map(async (file) =>
  JSON.parse(await readFile(file, "utf8"))));
if (JSON.stringify(configs[0]?.hooks) !== JSON.stringify(configs[1]?.hooks)) {
  errors.push("Claude and Codex hook graphs must stay identical");
}

const hookCommands = commands(configs[0]);
const requiredCommands = [
  "bash .claude/hooks/session-start.sh",
  "node .claude/hooks/session-start.mjs",
  "node .claude/hooks/fetch-main.mjs"
];
for (const required of requiredCommands) {
  if (!hookCommands.includes(required)) errors.push(`Missing shared hook command: ${required}`);
}
for (const command of hookCommands) {
  if (/[A-Za-z]:\\|pixelize-tool|\.codex\/hooks\//i.test(command)) {
    errors.push(`Hook command is not repository-portable: ${command}`);
  }
  const target = command.match(/^(?:node|bash)\s+([^\s]+)$/)?.[1];
  if (!target) errors.push(`Hook command is not allowlisted: ${command}`);
  else try {
    await access(target);
    const checker = target.endsWith(".sh") ? "bash" : process.execPath;
    const arguments_ = target.endsWith(".sh") ? ["-n", target] : ["--check", target];
    execFileSync(checker, arguments_, { stdio: "ignore" });
  } catch { errors.push(`Hook target is missing or invalid: ${target}`); }
}

const policyFiles = [
  ...configPaths,
  ".claude/hooks/session-start.sh",
  ".claude/hooks/session-start.mjs",
  ".claude/hooks/fetch-main.mjs"
];
for (const file of policyFiles) {
  const source = await readFile(file, "utf8");
  if (/pixelize-tool|docs\/conventions\.md|не пушить без|do not push without/i.test(source)) {
    errors.push(`${file}: stale or contradictory project policy`);
  }
}

const documentation = await readFile("docs/project/agent-hooks.md", "utf8");
for (const marker of [".claude/settings.json", ".codex/hooks.json", "validate:hooks"]) {
  if (!documentation.includes(marker)) errors.push(`Hook documentation misses ${marker}`);
}

if (errors.length) {
  console.error(`Hook validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`${hookCommands.length} shared Claude/Codex hook commands validated.`);
