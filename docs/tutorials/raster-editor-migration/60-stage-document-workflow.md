# Stage R5: Professional Document Workflow

- Status: `planned`
- Depends on: `R3`, `R4`
- Requirements: full `DOC-01`, `IO-01`, `UX-01`
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

## Failure cases

Unsupported PSD data is reported; a corrupt document does not hide healthy work;
save failure preserves last good revision; masked/locked layers reject painting;
disabled desktop capabilities retain import/export through browser fallback.

## Checks and acceptance

Create → paint → layer/mask/select/transform → save → restart → reopen → export
preserves dimensions, DPI, layer pixels/order and visible composite. Interrupted
save recovery and malformed import are tested explicitly.

## Completion record

- Commit/checks/deviations: pending
