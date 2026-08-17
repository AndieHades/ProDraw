import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { repositoryChangedFiles } from "../../tools/changed-files.mjs";

const temporaryDirectories: string[] = [];
const GIT_INTEGRATION_TIMEOUT_MS = 15_000;

function git(cwd: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

describe("repositoryChangedFiles", () => {
  it("returns tracked and untracked paths together", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "prodraw-changed-files-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, "docs"));
    await writeFile(path.join(root, "docs", "note.md"), "baseline\n");
    git(root, ["init", "--quiet"]);
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=ProDraw Test", "-c",
      "user.email=test@prodraw.invalid", "commit", "--quiet", "-m", "baseline"]);
    await writeFile(path.join(root, "docs", "note.md"), "changed\n");
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "new.ts"), "export {};\n");

    expect(repositoryChangedFiles(root)).toEqual(["docs/note.md", "src/new.ts"]);
  }, GIT_INTEGRATION_TIMEOUT_MS);
});
