# Stage R3: Brush Studio and Tablet Dynamics

- Status: `planned`
- Depends on: `R2`
- Requirements: `BRH-02..04`, `STB-01`, `SMG-01`, `HUI-01`, performance part of `DOC-01`, `DSK-01`
- Planned commit: `feat: add professional brush studio`

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
  pickup, pull, dilution/flow and pressure dynamics over local RGBA samples.
- `R3.11` Add Huion pressure calibration/curve, tilt, eraser/barrel mapping and
  a live Windows Ink diagnostics pad behind the platform-neutral pointer contract.
- `R3.12` Implement StreamLine, trajectory stabilization, motion filtering,
  pressure smoothing and pointer-up tail flush as a pure stroke pipeline.
- `R3.13` Use predicted samples only in replaceable preview; commit actual samples.
- `R3.14` Move decode/resample and smudge sampling work off the input path and
  enforce per-frame dirty-tile budgets.
- `R3.15` Bind single-LMB select, double-LMB Studio and RMB Duplicate/Delete;
  persist every created/duplicated brush into the current set's app-data folder.
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

- Commit/checks/deviations: pending
