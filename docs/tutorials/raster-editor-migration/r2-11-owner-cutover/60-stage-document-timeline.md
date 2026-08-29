# C5: Gallery, files and animation

- Stable id: `C5`
- Depends on: `C4`
- Status: `in_progress`

## Sub-stages

1. `C5A`: port gallery documents/folders, selection, stack, rename, duplicate,
   delete, thumbnails and gallery-first New/Open lifecycle to
   `DocumentRepository` without loading heavy pixels during enumeration.
2. `C5A`: port photo/file insert, PSD/native import and PNG/PSD/native export with
   delayed progress, cancel, atomic writes and localized compatibility reports.
3. `C5A`: complete Save as Canvas for selected layers/groups, one remembered
   destination and collision-safe multi-file output.
4. `C5B`: port timeline/frame operations, onion skin, playback and export;
   frames share document layers and bounded history/persistence.

## Edge and failure cases

Late open/import cannot replace newer work. Cancel writes nothing. Corrupt files
preserve last-good recovery. Frame deletion repairs selection references.
Playback/view caches do not mutate or retain abandoned surfaces.

## Checks and acceptance

Gallery lifecycle, native/PSD/PNG failure matrix, Save as Canvas scope/bounds,
animation edit/play/export and packaged restart pass. Every
row in the parent parity inventory is now typed and marked with evidence.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: pending
