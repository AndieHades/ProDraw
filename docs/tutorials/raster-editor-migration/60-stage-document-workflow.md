# Stage R5: Professional Document Workflow

- Status: `planned`
- Depends on: `R3`, `R4`
- Requirements: full `DOC-01`, `IO-01`, `EXP-01`, `EXP-02`, `TLB-01`, `UX-01`
- Planned commit: `feat: complete professional document workflow`

## Outcome

Layers, masks, selections, effects, gallery and interchange form one persistent
end-to-end workflow suitable for daily illustration and game-art use.

## Steps

- `R5.1` Complete groups, masks, clipping, alpha lock, opacity and blend modes.
- `R5.2` Add rectangular/freehand selection, feather, transform and clipboard.
- `R5.3` Port useful adjustments/effects through non-destructive contracts.
- `R5.4` Add import and exact PNG/JPEG export; define layered PSD support matrix.
- `R5.5` Implement atomic document/gallery storage, thumbnails and recovery.
- `R5.6` Add autosave boundaries, crash-safe writes and legacy read-only import.
- `R5.7` Complete RU/EN presentation, keyboard map and pen/touch/desktop parity.
- `R5.8` Restore the useful legacy layer-context export through the new raster
  document contract; do not reconnect the pixel-grid implementation.
- `R5.9` Add multi-selection and group-aware **Save as canvas** commands to the
  layer RMB menu. A group is saved as a new document named after the group and
  retains its nested groups, individual layers, order, visibility, opacity and
  blend state instead of being silently flattened.
- `R5.10` Preserve the two existing user-facing choices exactly: **Save as
  canvas — whole canvas** («Сохранить как холст — весь холст») and **Save as
  canvas — by contour** («Сохранить как холст — по контуру»)
  for one layer, selected layers and a whole group. Cropping uses the union of
  effective non-zero alpha bounds and reports an empty selection without writing.
- `R5.11` Route native Windows saves through an explicit Save As dialog. Seed
  the filename from the current document filename for selections, or from the
  layer/group name for a single root; sanitize only invalid filesystem characters.
- `R5.12` Remember the last successful export directory in desktop settings and
  reopen the next Save As dialog there. Cancel must not change that directory.
- `R5.13` For several standalone outputs, ask for a destination directory once,
  preserve unique layer filenames, and write atomically. A group-as-document is
  one layered ProDraw file, not an unlabelled directory of flattened PNG files.
- `R5.14` Activate Fill, rectangular Selection, freehand Lasso, Shapes (opening
  with Rectangle), Brighten, raster Tile Mode, Text and Actual Size through typed
  commands with selection/layer gating and one-step undo where pixels change.
- `R5.15` Render the final 16-command panel exclusively from the ordered registry
  in `05-tool-panel-ui-reference.md`; prove Text drags with the whole panel and
  prevent Pixel Perfect/global stabilization commands from reappearing.

## Context menu contract

| RMB target | Source scope | Default name | Structural result |
| --- | --- | --- | --- |
| one layer | clicked layer | layer name | one-layer ProDraw document |
| marked layers | full marked set | source document filename | layered ProDraw document |
| group | complete subtree | group name | group plus nested layer tree |

Each row exposes `Whole canvas` and `By contour`. PNG/JPEG remain explicit
flattened export formats; **Save as canvas** defaults to the native layered
document format so the wording never destroys editable structure unexpectedly.

## Failure cases

Unsupported PSD data is reported; a corrupt document does not hide healthy work;
save failure preserves last good revision; masked/locked layers reject painting;
disabled desktop capabilities retain import/export through browser fallback.
Save cancellation writes nothing; invalid or colliding names are resolved before
the first file is written; an interrupted multi-file save cannot present a
partially written file as a complete document.

## Checks and acceptance

Create → paint → layer/mask/select/transform → save → restart → reopen → export
preserves dimensions, DPI, layer pixels/order and visible composite. Interrupted
save recovery and malformed import are tested explicitly.

The context-menu matrix is tested for one layer, discontiguous selected layers
and a nested group in both bounds modes. Restarting the packaged app proves the
last successful directory is offered again, while cancel leaves it unchanged.

## Completion record

- Baseline note: the retired pixel editor contained single-layer PNG full/tight
  handlers and a broader export tree, but the R2 raster UI intentionally does not
  import them. The current raster build therefore has no working layer-context
  **Save as canvas** command; R5 must port behavior through typed raster contracts.
- Audit safety rebaseline: the single-record delayed autosave can lose the last
  stroke or replace the only work on New Canvas. Crash-safe identity, revisions,
  Open/Save/Save As and close flushing are therefore pulled forward as repair
  slice `F2`, before R4 feature work. R5 still owns the complete layer tree,
  multi-selection and the two structural Save as Canvas variants in `F7`.
- Commit/checks/deviations: pending
