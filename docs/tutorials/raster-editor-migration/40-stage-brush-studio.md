# Stage R3: Brush Studio and Tablet Dynamics

- Status: `planned`
- Depends on: `R2`
- Requirements: `BRH-02`, `STB-01`, performance part of `DOC-01`, `DSK-01`
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
- `R3.6` Add pointer diagnostics and configurable pen eraser/barrel behaviour.
- `R3.7` Implement StreamLine, trajectory stabilization, motion filtering,
  pressure smoothing and pointer-up tail flush as a pure stroke pipeline.
- `R3.8` Use predicted samples only in replaceable preview; commit actual samples.
- `R3.9` Move decode/resample work off the interaction path and enforce budgets.

## Failure cases

Unsupported archive fields are listed, not silently claimed; invalid numeric
settings clamp at the contract; cancelling edits restores the preset; mouse and
touch fallbacks do not invent tilt or intermittent pressure.

## Checks and acceptance

Golden stroke plans cover pressure, spacing, scatter and rotation with injected
randomness. Recorded pen traces prove jitter reduction, deliberate corner
retention, visible dots/short strokes, endpoint arrival and predicted-preview
replacement. Scratch and document rendering match. A4 pen smoke holds latency
within the recorded budget and every bundled brush remains selectable.

## Completion record

- Commit/checks/deviations: pending
