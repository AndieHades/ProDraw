import { access, mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const executable = path.resolve(
  process.argv[2] ?? "artifacts/desktop/win-unpacked/ProDraw.exe"
);
await access(executable);
const smokeProfile = await mkdtemp(path.join(tmpdir(), "prodraw-smoke-"));

try {
  await new Promise((resolve, reject) => {
    const child = spawn(executable, ["--smoke-test",
      `--user-data-dir=${smokeProfile}`, "--no-first-run"], {
      stdio: "inherit", windowsHide: true
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Packaged desktop smoke timed out"));
    }, 75_000);
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`Packaged desktop exited ${code}`));
    });
  });
} finally {
  const expectedParent = path.resolve(tmpdir());
  if (path.dirname(path.resolve(smokeProfile)) === expectedParent &&
      path.basename(smokeProfile).startsWith("prodraw-smoke-")) {
    await rm(smokeProfile, { recursive: true, force: true });
  }
}
console.log("Packaged Windows desktop smoke passed.");
