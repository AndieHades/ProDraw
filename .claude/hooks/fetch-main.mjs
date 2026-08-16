import { execFileSync } from "node:child_process";

const projectDirectory = process.env.CLAUDE_PROJECT_DIR ??
  process.env.CODEX_PROJECT_DIR ?? process.cwd();

async function inputJson() {
  let source = "";
  for await (const chunk of process.stdin) source += chunk;
  try { return JSON.parse(source || "{}"); } catch { return {}; }
}

function git(args) {
  return execFileSync("git", args, {
    cwd: projectDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

const input = await inputJson();
const eventName = typeof input.hook_event_name === "string"
  ? input.hook_event_name : "UserPromptSubmit";
const command = input?.tool_input?.command;
if (eventName === "PreToolUse" &&
    (typeof command !== "string" || !command.includes("git push"))) process.exit(0);

try {
  git(["rev-parse", "--git-dir"]);
  git(["fetch", "origin", "main", "--quiet"]);
  const behind = Number(git(["rev-list", "--count", "HEAD..origin/main"]));
  if (behind > 0) {
    const additionalContext = `origin/main впереди на ${behind} коммит(ов). ` +
      "До коммита/пуша перенеси task-owned работу поверх origin/main и повтори " +
      "gate из docs/project/validation-policy.md.";
    process.stdout.write(JSON.stringify({ hookSpecificOutput: {
      hookEventName: eventName, additionalContext
    } }));
  }
} catch {
  // Offline or non-repository hook execution must not block the agent session.
}
