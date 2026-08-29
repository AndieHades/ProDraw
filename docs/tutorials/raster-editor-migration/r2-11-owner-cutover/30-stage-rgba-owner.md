# C2: Single tiled RGBA owner

- Stable id: `C2`
- Depends on: `C1F`
- Status: `in_progress`
- Scope: document/session, drawing, render, history and base layers

## Sub-stages

1. `C2A`: normalize New/Open/imported live raster records to one stable
   `RasterSurface`; compatibility views may translate access but never own or
   mirror pixels.
2. `C2B`: make Brush/Eraser/Smudge/Fill produce one `RasterEdit` and one
   byte-bounded `TileHistory` transaction against that surface.
3. `C2C`: replace legacy composite/cache with `DocumentCompositor` and route
   base add/select/visibility/opacity/lock/reorder through one command owner.
4. `C2D`: connect typed session, autosave, New/Open cancellation, dirty state
   and persistence, then delete the superseded image/history owners.

Each sub-stage is a focused commit, leaves the editor usable and lowers the
registered JS/legacy-state ceiling only by the owners it actually removes.

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
