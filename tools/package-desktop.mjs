import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { runNpmScripts } from "./command-runner.mjs";

const require = createRequire(import.meta.url);
const builderCli = require.resolve("electron-builder/out/cli/cli.js");
const output = process.env.CI
  ? path.resolve("artifacts/desktop")
  : path.join(process.env.LOCALAPPDATA ?? process.cwd(), "ProDraw", "desktop-build");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited ${code}`));
    });
  });
}

await runNpmScripts(["validate:desktop", "build:desktop"]);
await run(process.execPath, [builderCli, "--win", "--x64", "--dir",
  `--config.directories.output=${output}`]);
const executable = path.join(output, "win-unpacked", "ProDraw.exe");
await run(process.execPath, [path.resolve("tools/smoke-packaged-desktop.mjs"), executable]);
console.log(`Packaged desktop output: ${path.join(output, "win-unpacked")}`);
