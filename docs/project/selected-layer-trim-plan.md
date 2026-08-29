# Selected layer trim plan

Status: `done`

- Owner: selected-content canvas trim
- Baseline: `aset-editor@305a069`, 2026-08-28
- Stage: `SLT1`

## Evidence baseline

- `src/core/targets.js` already resolves the active layer, marked layers and all
  descendants of selected folders, including hidden layers.
- `src/core/canvas-bounds.js` unions raster, off-canvas `ext` pixels and effect
  reach without filtering by visibility.
- `src/core/document.js#applyCropRect` remaps every document layer and animation
  frame through one reference-backed `document-remap-patch`; clipped pixels move
  to `ext` instead of being discarded.
- The sidebar has interactive Canvas size Crop but no direct selected-layer trim
  command. The older `canvas.trim` action trims to all timeline content and has
  no toolbar button.

## Target contract

- `SLT-01`: add a distinct sidebar command titled `Обрезать слои` next to Canvas
  size Crop; invoking it does not enter an interactive mode.
- `SLT-02`: compute one union bounds from the active/marked layers and every
  descendant of each selected folder. Hidden layers participate.
- `SLT-03`: include selected layer effects and the effects of selected folders
  and their nested folder tree so rendered content is not clipped.
- `SLT-04`: overlapping targets use the outer union; empty targets do not shrink
  a non-empty union, and an entirely empty target set leaves the canvas intact.
- `SLT-05`: apply the new canvas bounds to the whole document in one history
  operation. Pixels from unselected layers outside those bounds remain stored,
  and one Undo restores exact dimensions, raster references and all pixels.
- `SLT-06`: move trim decisions behind an explicit TypeScript port while a thin
  JS composition bridge injects legacy state/history dependencies. Crop, Pan
  and Undo must be verified before any wider TypeScript migration continues.

## Change map

1. Add a pure selected-folder effect-scope resolver beside the existing target
   selection contract.
2. Add the typed trim owner and register `canvas.trimSelected` through the thin
   legacy composition bridge.
3. Bind a localized sidebar button through the typed tool-panel port and allow
   it in persisted panel ordering.
4. Test hidden nested folders, union bounds, empty selections and exact Undo of
   unselected off-bounds pixels.
5. Run focused tests, typecheck/lint, changed-surface validation and packaged
   desktop smoke.

## Risks and rollback

- Selecting a folder must not accidentally include sibling folders; folder
  effects are limited to selected folder subtrees.
- Current animation-frame selection defines the trim rectangle, while the crop
  remap keeps all stored frames aligned and recoverable.
- The command keeps existing layer/folder selection state and never changes
  visibility.
- Rollback removes one action/button and restores the prior JS trim owner; no
  persistence schema changes are involved.

## Completion definition

- Automated tests prove hidden/nested target union and larger-over-smaller
  behavior.
- Automated tests prove unselected pixels outside the trimmed canvas survive in
  `ext`, and one Undo restores their original grid reference and value.
- Shell action typing, i18n, persisted toolbar ordering and the Windows package
  all accept the new command.

## Completion record

- The sidebar now has a distinct localized `Обрезать слои` command beside
  interactive Canvas size Crop.
- Active/marked layers and selected folder subtrees form one union bounds;
  hidden layers, nested folders and their selected-scope effects participate.
- The document remap keeps pixels from all other layers in `ext`; one Undo
  restores original dimensions, raster references and pixel values.
- Focused Crop/Pan/Undo gate: 7 files, 25 tests passed.
- Changed-surface gate: 97 files, 290 tests plus check, lint, docs, architecture,
  cycles, cutover, desktop, raster-entry and shell catalog passed.
- Packaged Windows renderer smoke passed from `artifacts/desktop/win-unpacked`.

## Resume Here

- Current stage: complete
- Status: `done`
- Last completed stage: `SLT1 — selected-content trim`
- Next action: user acceptance of the packaged Crop/Pan build
- Blockers: none
- Working paths: `src/core`, `src/systems/trim`, `src/ui/shell`, `tests`
- Last checks: focused 25/25; changed-surface 290/290; packaged smoke passed
- Last updated: 2026-08-28
