# Layer-selection PNG export plan

- Status: `done`
- Owner: production shell (`index.html -> src/legacy-entry.js -> src/app.js`)
- Baseline: `aset-editor@6e3a9b3`, 2026-08-27
- Stage: `LPX1`

## Evidence baseline

- `src/systems/layers/menu.js` exposes whole-canvas and cropped PNG for one
  context target, plus a third folder-only `export.folderLayersPng` command.
- `src/systems/export/pipeline.js` saves one flattened target through `saveFile`,
  while folder leaves use one staged `FileTreeWriter` session.
- `src/systems/export/tree.js` already resolves active and marked layer/folder
  rows into ordered, non-duplicated selected roots.
- `src/logic/export/folderPngPlan.ts` preserves nested folders, empty folders,
  Windows-safe names and sibling collision suffixes.

## Target contract

- `LPX-01`: the layer/folder context menu has only `Save PNG (whole canvas)`
  and `Save PNG (cropped)`; the separate `Save layers as PNG` item is removed.
- `LPX-02`: either command exports the current layer/folder selection when the
  context target belongs to it; otherwise it exports only the context target.
- `LPX-03`: exactly one selected layer produces one PNG through the normal file
  save boundary. Whole-canvas output is document-sized; cropped output uses the
  final alpha bounds, with a transparent `1 x 1` result for an empty layer.
- `LPX-04`: multiple selected roots, or any selected folder, produce one staged
  PNG tree after one destination choice. Every descendant layer gets its own
  file; folder nesting and empty folders are retained.
- `LPX-05`: batch whole-canvas output keeps document dimensions. Batch cropped
  output trims every leaf independently after its layer effects are rendered.
  Hidden layers export stored pixels; group-wide effects are not duplicated
  into each descendant file.
- `LPX-06`: batch publication remains atomic: any render, encode or write error
  aborts the unpublished tree and reports localized failure.

## Change map

1. Generalize the PNG-tree planner from one folder root to arbitrary selected
   roots while keeping the existing folder wrapper contract.
2. Add one selection-aware PNG export orchestrator that chooses single-file or
   staged-tree output and applies the requested bounds mode.
3. Route both context-menu PNG items through that orchestrator; delete the third
   menu item, action registration and unused localization keys.
4. Replace folder-only tests with selection, folder, full-canvas, cropped,
   hidden/empty, one-session and abort coverage.

## Verification

- Focused Vitest for PNG planning, export orchestration and layer-menu routing.
- `npm run check` and targeted ESLint.
- `npm run validate:changed`, `npm run validate:lines`, `git diff --check`.
- Packaged desktop smoke if the executable is not locked by a running app.
- Visual acceptance remains user-owned; no screenshot QA is planned.

## Completion definition

- The two menu commands are the only layer/folder PNG actions.
- Single-layer and batch paths satisfy the geometry and selection contracts.
- One batch export opens one destination session and preserves hierarchy.
- Checks and implementation commit are recorded below.

## Completion record

- Commit: `feat: make PNG actions selection-aware`.
- The two existing commands now save one selected layer directly or expand a
  folder/multiple selection into one staged PNG tree; the third menu item and
  obsolete action/i18n surface were removed.
- Whole-canvas output retains document dimensions. Cropped output uses each
  leaf's final alpha bounds, including a transparent `1 x 1` empty result.
- Checks: focused Vitest `9/9`; changed-surface Vitest `262/262`; TypeScript,
  ESLint, docs, hooks, lines, architecture, cycles, cutover, desktop boundary,
  raster entry and shell catalog passed; packaged Windows smoke passed.
- `node test/module-int.mjs` remains unavailable because that historical
  pre-cutover harness imports removed `src/systems/brush-bar.js`.

## Resume Here

- Current stage: complete
- Status: `done`
- Last completed stage: `LPX1 — selection-aware layer PNG export`
- Next action: user-owned visual acceptance in the packaged desktop app
- Blockers: none
- Working paths: `src/systems/export`, `src/systems/layers/menu.js`,
  `src/logic/export/folderPngPlan.ts`, `src/i18n`, `index.html`, `tests`
- Last checks: focused `9/9`; changed-surface `262/262`; packaged smoke passed
- Last updated: 2026-08-27
