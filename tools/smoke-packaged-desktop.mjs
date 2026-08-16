import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const executable = path.resolve("artifacts/desktop/win-unpacked/ProDraw.exe");
await access(executable);

await new Promise((resolve, reject) => {
  const child = spawn(executable, ["--smoke-test"], {
    stdio: "inherit",
    windowsHide: true
  });
  const timeout = setTimeout(() => {
    child.kill();
    reject(new Error("Packaged desktop smoke timed out"));
  }, 20_000);
  child.on("error", reject);
  child.on("exit", (code) => {
    clearTimeout(timeout);
    if (code === 0) resolve();
    else reject(new Error(`Packaged desktop exited ${code}`));
  });
});
console.log("Packaged Windows desktop smoke passed.");
