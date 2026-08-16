import { execFileSync } from "node:child_process";

function gitLines(args, cwd) {
  const source = execFileSync("git", args, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  return source ? source.split(/\r?\n/).filter(Boolean) : [];
}

export function repositoryChangedFiles(cwd = process.cwd()) {
  const tracked = gitLines(["diff", "--name-only", "HEAD"], cwd);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard"], cwd);
  return [...new Set([...tracked, ...untracked])].sort();
}
