import { runNpmScripts } from "./command-runner.mjs";

await runNpmScripts([
  "check",
  "lint",
  "test",
  "validate:docs",
  "validate:hooks",
  "validate:lines",
  "validate:architecture",
  "validate:cycles",
  "validate:desktop",
  "validate:raster-entry",
  "build:bundle"
]);
console.log("Full repository validation passed.");
