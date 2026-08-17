import { runNpmScripts } from "./command-runner.mjs";

await runNpmScripts([
  "check",
  "lint",
  "test",
  "validate:docs",
  "validate:hooks",
  "validate:interface",
  "validate:lines",
  "validate:architecture",
  "validate:cycles",
  "validate:cutover",
  "validate:cutover-fixtures",
  "validate:desktop",
  "validate:raster-entry",
  "validate:shell-catalog",
  "build:bundle"
]);
console.log("Full repository validation passed.");
