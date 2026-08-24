export function cutoverErrors(model) {
  const { cutover, entries, graph, sourceJavaScriptCount,
    legacyStateJavaScriptCount } = model;
  const errors = [];
  if (!cutover || !new Set(["bridge", "shell", "target"]).has(cutover.runtimeMode)) {
    return ["project.config.json must declare a bridge, shell or target cutover mode"];
  }
  if (entries.length !== 1 || entries[0] !== cutover.productionEntry) {
    errors.push(`index must load only ${cutover.productionEntry}`);
  }
  if (sourceJavaScriptCount > cutover.maximumSourceJavaScriptFiles) {
    errors.push(`source JavaScript grew to ${sourceJavaScriptCount}`);
  }
  if (legacyStateJavaScriptCount > cutover.maximumLegacyStateJavaScriptFiles) {
    errors.push(`legacy state JavaScript grew to ${legacyStateJavaScriptCount}`);
  }
  if (cutover.runtimeMode === "bridge") {
    for (const required of [cutover.productionEntry, "src/app.js", "src/main.ts"]) {
      if (!graph.has(required)) errors.push(`bridge graph is missing ${required}`);
    }
    if (graph.has(cutover.targetEntry)) {
      errors.push("detached target entry must not be reported as live while bridge mode is active");
    }
  } else if (cutover.runtimeMode === "target") {
    if (entries[0] !== cutover.targetEntry) errors.push("target mode must boot the target entry");
    const graphJavaScript = [...graph].filter((file) => file.endsWith(".js"));
    if (graphJavaScript.length) {
      errors.push(`target graph still imports JS: ${graphJavaScript.join(", ")}`);
    }
  } else if (graph.has(cutover.targetEntry)) {
    errors.push("shell mode must not load the detached target entry");
  }
  return errors;
}
