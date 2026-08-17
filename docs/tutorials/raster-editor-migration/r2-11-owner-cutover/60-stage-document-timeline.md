# C5: Gallery, files, tile suite and animation

- Stable id: `C5`
- Depends on: `C4`
- Status: `pending`

## Steps

1. Port gallery documents/folders, selection, stack, rename, duplicate, delete,
   thumbnails and gallery-first New/Open lifecycle to `DocumentRepository`.
2. Port photo/file insert, PSD/native import and PNG/PSD/native export with
   progress, cancel, atomic writes and localized compatibility reports.
3. Complete Save as Canvas for layer selections and groups, remembered native
   directory and collision-safe multi-file output.
4. Port tile palette, variants, selection, map create/edit/export and layer
   conversion as typed raster/document extensions, not a second image model.
5. Port timeline/frame operations, onion skin, playback and export; frames share
   the document layer-tree contract and bounded history/persistence.

## Edge and failure cases

Late open/import cannot replace newer work. Cancel writes nothing. Corrupt files
preserve last-good recovery. Tile/frame deletion repairs selection references.
Playback/view caches do not mutate or retain abandoned surfaces.

## Checks and acceptance

Gallery lifecycle, native/PSD/PNG failure matrix, Save as Canvas scope/bounds,
tile map round trip, animation edit/play/export and packaged restart pass. Every
row in the parent parity inventory is now typed and marked with evidence.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: pending
