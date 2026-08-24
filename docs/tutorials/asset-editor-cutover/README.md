# Asset editor cutover

Status: `done`

Evidence baseline: `aset-editor@db8617c`, 2026-08-23.

## Scope

`ASSET-01` replaces the brush library with two built-in hard shapes and removes
Brush Studio, Procreate decoding and brush-only input/UI, including Smudge,
from the live shell. `ASSET-02` retains lightweight hard Pencil/Eraser input
with size, opacity, active color and persisted last shape. `ASSET-03` makes
the existing whole-document horizontal flip an
explicit toolbar action and proves its persisted/exported result. PSD/PNG
import/export, document persistence/gallery, layers, folders, selection and
viewport navigation remain protected behavior.

`ASSET-04` makes normal export and layer-context export use the same PSD
producer for active or multiple selected layers. `ASSET-05` reduces the crop
panel to canvas-size and crop controls only. `ASSET-06` writes an opened PSD
back to its original desktop path and acknowledges only a successful write.

## Stages

| Stage | Outcome | Status |
| --- | --- | --- |
| `AE0` | evidence and contract | done |
| `AE1` | remove brush ownership and UI | done |
| `AE2` | hard eraser and document flip proof | done |
| `AE3` | validation, cleanup and handoff | done |
| `AE4` | unified PSD selected-layer export and crop-panel cleanup | done |
| `AE5` | opened PSD save to original desktop file | done |

## Completion definition

- The production entrypoint opens without an external brush service.
- Only the persisted round/square built-in library remains; no Studio,
  Procreate source decoder, brush cursor or required external brush runtime remains.
- Pencil and Eraser use configurable hard size and opacity; Eraser clears alpha.
- Horizontal document flip preserves layer metadata/order and appears in PSD
  and PNG output.
- PSD reopen/export, gallery/document and focused asset-editor tests pass.
- PSD export from the main action and layer context menu agrees for one or
  several selected layers.
- Save overwrites the original opened `.psd` atomically and reports success
  only after the desktop write completes.

## Resume Here

- Current stage: `complete`
- Status: `done`
- Last completed stage: `AE5 — PSD save to original desktop file`
- Next action: user-owned visual acceptance.
- Blockers: none.
- Working paths: `src/legacy-entry.js`, `src/app.js`, `src/systems/draw`,
  `src/ui/shell`, `src/app`, `src/core`, `index.html`, `tests`.
- Last checks: focused save/import/cursor tests passed; source, lint and wide
  validation gates run; no visual QA requested.
- Last updated: 2026-08-23

## Chapters

1. [Current state](01-current-state.md)
2. [Target contract](02-target-contract.md)
3. [Decisions and risks](03-decisions-and-risks.md)
4. [Implementation](10-stage-cutover.md)
5. [Verification](90-verification.md)
