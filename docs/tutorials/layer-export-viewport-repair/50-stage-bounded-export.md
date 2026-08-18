# LEP5: Bounded Multi-file Export

- Stable id: `LEP5`
- Status: `pending`
- Depends on: `LEP4`
- Requirements: `LEP-EXP-01`, `LEP-EXP-02`

## Contract

Separate export processes one item through render, encode and save before
starting the next. For shared trimmed bounds, a first pass retains only the
accumulated rectangle, then each item is rendered again for its final file.
Returned results contain metadata rather than every encoded blob.

The Export button is disabled during the awaited run. Success closes the export
window; failure restores the button, keeps the editor/document active and shows
localized feedback. No export path calls the gallery system.

## Steps

1. Split item planning from rendering.
2. Add a bounded shared-bounds measurement pass.
3. Interleave render, encode and save for every separate item.
4. Return lightweight result metadata and release output references.
5. Await and guard the export UI action; handle failure locally.
6. Prove operation ordering, re-entry protection and editor-state preservation.

## Acceptance

- A probe records `render → encode → save` before the next item starts.
- Shared trim does not retain canvases from its measurement pass.
- Failure produces localized feedback without `gallery.show` or page reload.
- Existing flattened, layered and folder-tree exports retain their behavior.

## Completion record

- Commit: pending.
- Checks: pending.
