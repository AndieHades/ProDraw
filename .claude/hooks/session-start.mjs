const reminders = [
  "Read AGENTS.md, docs/index.md and docs/rule-packs/README.md before edits.",
  "After compaction or handoff, follow docs/project/context-recovery.md.",
  "For plans or migrations, read docs/rule-packs/10-ai-workflow/planning.md.",
  "Use the live roadmap and Resume Here; record unrelated ideas in the inbox.",
  "Keep working code/CSS/config under 150 lines; split instead of packing.",
  "Production runtime is strict TypeScript with typed commands and events.",
  "Systems do not import systems; UI does not mutate raster surfaces directly.",
  "View transforms never resample source art; Apply resamples once from source.",
  "User text uses i18n and visual constants use theme/config tokens.",
  "Run the smallest sufficient gate from docs/project/validation-policy.md."
];

const output = {
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: reminders.join(" ")
  }
};

process.stdout.write(JSON.stringify(output));
