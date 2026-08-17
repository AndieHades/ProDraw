# C2: Single tiled RGBA owner

- Stable id: `C2`
- Depends on: `C1`
- Status: `in_progress`
- Scope: document/session, drawing, render, history and base layers

## Steps

1. Extend typed document descriptors for the base layer/tree identity required
   by preserved presenters; keep copied serializable view models.
2. Make every Brush/Eraser/Smudge/Fill input produce one `RasterEdit` against
   the selected surface and one byte-bounded history transaction.
3. Replace bridge composite/render/cache with `DocumentCompositor` and reusable
   presentation tiles behind the existing `#cv` element.
4. Route add/select/visibility/opacity/lock/reorder base-layer actions through
   one document command owner.
5. Connect autosave, New/Open transition cancellation and dirty status to that
   same session. Delete the corresponding old image/history owners.

## Edge and failure cases

Hidden/locked layers reject mutation visibly. Cancel/capture loss restores exact
bytes. A failed save retains dirty state. Replacing a document forgets old
surfaces/history/cache and cannot be overwritten by a late open.

## Checks

- pen/touch/mouse -> RGBA -> frame -> Undo/Redo -> autosave/reopen scenario;
- all 12 brush goldens and Studio/document equality;
- A5/A4 pointer and dirty-tile performance gates;
- existing shell drawing/layer browser smoke.

## Acceptance

All visible base painting/layer actions use `RasterDocument`, `RasterSurface`
and `TileHistory`; production no longer allocates or serializes `grid[y][x]` for
those actions, while the exact UI remains.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: pending
