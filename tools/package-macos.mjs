import { cp, lstat, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { run, runNpmScripts } from "./command-runner.mjs";

const require = createRequire(import.meta.url);
const builderCli = require.resolve("electron-builder/out/cli/cli.js");
const output = await mkdtemp(path.join(tmpdir(), "prodraw-macos-"));
const target = "/Applications/ProDraw.app";
const architecture = process.arch === "arm64" ? "arm64" : "x64";
const bundleDirectory = architecture === "arm64" ? "mac-arm64" : "mac";
const bundle = path.join(output, bundleDirectory, "ProDraw.app");
const executable = path.join(bundle, "Contents", "MacOS", "ProDraw");

async function exists(location) {
  try {
    await lstat(location);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

try {
  await runNpmScripts(["validate:desktop", "build:desktop"]);
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  await run(process.execPath, [builderCli, "--mac", `--${architecture}`, "--dir",
    `--config.directories.output=${output}`]);
  await run("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", bundle]);
  await run("/usr/bin/codesign", ["--verify", "--deep", "--strict", bundle]);
  await run(process.execPath, [path.resolve("tools/smoke-packaged-desktop.mjs"),
    executable]);
  if (await exists(target)) {
    await run("/usr/bin/rsync", ["-a", "--delete", `${bundle}/`, `${target}/`]);
  } else {
    await cp(bundle, target, { recursive: true });
  }
  console.log(`Installed macOS application: ${target}`);
} finally {
  await rm(output, { recursive: true, force: true });
}
