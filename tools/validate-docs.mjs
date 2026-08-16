import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryFiles } from "./repository-files.mjs";
import { validatePlanRecovery } from "./validate-plan-recovery.mjs";

const required = [
  "AGENTS.md", "CLAUDE.md", "project.config.json", "docs/index.md",
  "docs/rule-packs/README.md",
  "docs/rule-packs/00-core/repository-rules.md",
  "docs/rule-packs/10-ai-workflow/agent-operation.md",
  "docs/rule-packs/10-ai-workflow/planning.md",
  "docs/rule-packs/20-architecture/layers.md",
  "docs/project/context-recovery.md", "docs/project/roadmap.md",
  "docs/project/validation-policy.md", "docs/project/idea-inbox.md",
  "docs/tutorials/README.md",
  "docs/tutorials/raster-editor-migration/README.md"
];
const errors = [];

for (const file of required) {
  try { await access(file); } catch { errors.push(`Missing required file: ${file}`); }
}

const markdown = (await repositoryFiles()).filter((file) => file.endsWith(".md"));
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of markdown) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!raw || /^(?:https?:|mailto:)/.test(raw)) continue;
    const target = path.resolve(path.dirname(file), decodeURI(raw));
    try { await access(target); } catch { errors.push(`${file}: broken link ${match[1]}`); }
  }
}

const planningPath = "docs/rule-packs/10-ai-workflow/planning.md";
for (const file of ["AGENTS.md", "CLAUDE.md", "docs/index.md"]) {
  const source = await readFile(file, "utf8");
  if (!source.includes(planningPath) && !source.includes("planning.md")) {
    errors.push(`${file}: must link ${planningPath}`);
  }
}

const registry = await readFile("docs/tutorials/README.md", "utf8");
for (const file of markdown.filter((item) => /^docs\/tutorials\/[^/]+\/README\.md$/.test(item))) {
  const source = await readFile(file, "utf8");
  if (!/^Status: `(draft|ready|in_progress|blocked|done|superseded)`/m.test(source))
    errors.push(`${file}: invalid or missing Status`);
  if (!source.includes("## Resume Here")) errors.push(`${file}: missing Resume Here`);
  const folder = file.split("/").at(-2);
  if (!registry.includes(`${folder}/README.md`)) errors.push(`${file}: not registered`);
}
errors.push(...await validatePlanRecovery());

if (errors.length) {
  console.error(`Documentation validation failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Documentation structure and local links validated.");
