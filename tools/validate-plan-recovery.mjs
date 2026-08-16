import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const packageRoot = "docs/tutorials/raster-editor-migration";
const allowedStatuses = new Set(["draft", "ready", "in_progress", "blocked", "done",
  "superseded", "planned"]);

function tableStatus(source, id) {
  const line = source.split(/\r?\n/).find((candidate) => candidate.startsWith(`| \`${id}\``));
  if (!line) return null;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return cells.map((cell) => cell.replaceAll(" ", "_"))
    .find((cell) => allowedStatuses.has(cell)) ?? null;
}

function commitExists(hash) {
  try {
    execFileSync("git", ["cat-file", "-e", `${hash}^{commit}`], { stdio: "ignore" });
    return true;
  } catch { return false; }
}

export async function validatePlanRecovery() {
  const errors = [];
  const read = (file) => readFile(path.join(packageRoot, file), "utf8");
  const readme = await read("README.md");
  const roadmap = await readFile("docs/project/roadmap.md", "utf8");
  const stageFiles = (await readdir(packageRoot)).filter((file) =>
    /^\d+-stage-.*\.md$/.test(file));
  const stages = [];

  for (const file of stageFiles) {
    const source = await read(file);
    const id = source.match(/^# Stage (R\d+):/m)?.[1];
    const status = source.match(/^- Status: `([^`]+)`/m)?.[1];
    if (!id || !status || !allowedStatuses.has(status)) {
      errors.push(`${file}: missing stage id or valid status`); continue;
    }
    stages.push({ file, id, status });
    if (tableStatus(readme, id) !== status) errors.push(`${id}: README status differs`);
    if (tableStatus(roadmap, id) !== status) errors.push(`${id}: roadmap status differs`);
    if (status === "done") {
      const completion = source.split("## Completion record")[1] ?? "";
      const hashes = [...completion.matchAll(/\b[0-9a-f]{7,40}\b/g)].map((match) => match[0]);
      if (!hashes.length) errors.push(`${file}: done stage needs an exact commit hash`);
      for (const hash of hashes) {
        if (!commitExists(hash)) errors.push(`${file}: unknown completion commit ${hash}`);
      }
    }
  }

  const active = stages.filter(({ status }) => status === "in_progress");
  if (active.length !== 1) errors.push(`Expected one in-progress stage, found ${active.length}`);
  const current = readme.match(/^- Current stage: `(R\d+)/m)?.[1];
  const resumeStatus = readme.match(/^## Resume Here[\s\S]*?^- Status: `([^`]+)`/m)?.[1];
  if (current !== active[0]?.id || resumeStatus !== "in_progress") {
    errors.push("Resume Here must identify the one in-progress stage");
  }
  for (const field of ["Current stage", "Status", "Last completed stage", "Next action",
    "Blockers", "Working paths", "Last checks", "Last updated"]) {
    if (!new RegExp(`^- ${field}:`, "m").test(readme)) errors.push(`Resume Here misses ${field}`);
  }
  const baseline = readme.match(/Evidence baseline: `(?:main@)?([0-9a-f]{7,40})`/)?.[1];
  if (!baseline || !commitExists(baseline)) errors.push("README evidence baseline is not a commit");
  return errors;
}
