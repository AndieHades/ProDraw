# Stage R3: Brush Studio and Tablet Dynamics

- Status: `in_progress`
- Depends on: `R2`
- Requirements: `BRH-02..04`, `STB-01`, `SMG-01`, `HUI-01`, performance part of `DOC-01`, `DSK-01`
- Planned commits: `feat: add folder-backed brush studio`, then
  `feat: add stabilized Huion brush and smudge`

## Outcome

Brush Studio edits and previews the parameters artists expect, while Windows pen
pressure/tilt produce smooth repeatable strokes on A4/4K documents.

## Steps

- `R3.1` Define versioned brush preset and compatibility-report contracts.
- `R3.2` Map supported Procreate spacing/jitter/size/opacity/orientation fields.
- `R3.3` Add editable shape, grain, spacing, flow, opacity, scatter, angle,
  roundness, hardness, stabilization and pressure/tilt curves.
- `R3.4` Use one renderer for document strokes, preview cards and scratch pad.
- `R3.5` Add import/duplicate/rename/delete/reset/export and atomic persistence.
- `R3.6` Build the Procreate-like set rail and brush grid with persistent folders,
  drag/reorder, Recent, Favorites and one-time bundled `Main` seeding.
- `R3.7` Match `04-brush-studio-ui-reference.md`: two-pane library, named live
  stroke rows and compact resizable three-column Studio with draft Cancel/Apply.
- `R3.8` Include only Stroke Path, Stabilization, Taper, Shape, Grain, Rendering,
  Dynamics, Huion Stylus, Properties, Preview and About sections.
- `R3.9` Add screenshot-defined Stroke Path and Stabilization controls exactly;
  explicitly omit Wet Mix, Color Dynamics, Materials and Apple Pencil.
- `R3.10` Add Smudge as a tool sharing brush selection/stabilization, with strength,
  pickup, pull, flow and pressure dynamics over local RGBA samples. This is a
  Smudge contract, not the excluded Wet Mix brush section.
- `R3.11` Add Huion pressure calibration/curve, tilt, eraser/barrel mapping and
  a live Windows Ink diagnostics pad behind the platform-neutral pointer contract.
- `R3.12` Implement StreamLine, trajectory stabilization, motion filtering,
  pressure smoothing and pointer-up tail flush as a pure stroke pipeline.
- `R3.13` Use predicted samples only in replaceable preview; commit actual samples.
- `R3.14` Move decode/resample and smudge sampling work off the input path and
  enforce per-frame dirty-tile budgets.
- `R3.15` Bind single-LMB select, double-LMB Studio and RMB Duplicate/Delete;
  persist every created brush in the selected set and every duplicate beside
  its source brush in the corresponding app-data folder.
- `R3.16` Reconcile set rename/move/delete with physical directories, atomic
  writes, collision handling and recoverable trash.

## Failure cases

Unsupported archive fields are listed, not silently claimed; invalid numeric
settings clamp at the contract; cancelling edits restores the preset; mouse and
touch fallbacks do not invent tilt or intermittent pressure. Smudge rejects
locked/hidden layers and cannot bleed pixels outside selection/mask contracts.

## Checks and acceptance

Golden stroke plans cover pressure, spacing, scatter and rotation with injected
randomness. Recorded pen traces prove jitter reduction, deliberate corner
retention, visible dots/short strokes, endpoint arrival and predicted-preview
replacement. Scratch and document rendering match. A4 pen smoke holds latency
within the recorded budget and every bundled brush remains selectable. Library
set/order/favorite state survives restart; smudge mixes a controlled two-colour
fixture without changing pixels outside dirty bounds and undoes in one step.

## Completion record

- R3A working checkpoint: the versioned native preset, one-time `Main` seed,
  physical set directories, atomic create/revision writes, recoverable trash,
  compact Studio, exact section/control inventory, live pad, single/double/RMB
  bindings, create/duplicate/delete, and live Recent/Favorites collections are
  implemented. Set reorder/rename/move, library metadata persistence and
  import/export/reset remain in R3 after this checkpoint.
- R3B remains the actual stabilization pipeline, Huion calibration diagnostics
  against recorded pen traces, performance budgets and Smudge.
- R3A checks: full `npm run validate` (30 TypeScript and 128 retained legacy
  logic tests), `npm run package:desktop`, packaged executable smoke and browser
  library/create/Recent/Favorites/single-LMB/double-LMB/RMB/Studio
  Cancel/Apply checks passed. Studio was visually confirmed as a compact
  three-column 900×620-class window rather than fullscreen.
- Windows-specific evidence: the rebuilt packaged app started with an isolated
  user-data profile and seeded exactly 12 `.brush` files plus `.seeded-v1` into
  `brushes/Main`; the desktop validator now rejects project-local `require()`
  from the sandboxed preload that would disable the bridge after packaging.
- Commit: R3A folder-backed Brush Studio checkpoint (this commit).
- R3B checkpoint: the production document and Drawing Pad now share a stateful
  stabilization pipeline. StreamLine, trajectory stabilization and motion
  filtering reduce short-scale variation; pressure has its own smoothing and
  four-point Huion response; deliberate long-segment corners receive a retention
  boost; `finish()` emits the exact actual endpoint so dots and tails are kept.
- Smudge («Палец») uses the selected brush shape/grain/spacing and the same
  stabilization, carries locally sampled RGBA pigment with strength/pickup/pull/
  flow, respects editable-layer gating and commits one tile-patch undo entry.
  Huion eraser and barrel bitfields resolve through the preset's Eraser/Smudge
  mappings; the Studio pad reports actual pressure, tilt and button bitfield.
- R3B evidence: 38 TypeScript tests plus 128 retained legacy logic tests; jitter,
  corner, dot, endpoint, pressure curve, omitted-coalesced-endpoint, stylus mapping
  and two-colour bounded Smudge fixtures; A4 browser red→blue directed-smear and
  one-step Undo smoke; full validate and packaged Windows executable smoke passed.
- Residual R3: real-device Huion trace/manual acceptance, predicted replaceable
  preview and dirty-tile frame budgets; set metadata/reorder/rename/move,
  import/export/reset and persistent Recent/Favorites.
- Commit: R3B stabilized Huion brush and Smudge checkpoint (this commit).
