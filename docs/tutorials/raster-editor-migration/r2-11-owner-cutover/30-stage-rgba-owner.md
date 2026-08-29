# C2: Single tiled RGBA owner

- Stable id: `C2`
- Depends on: `C1F`
- Status: `in_progress`
- Scope: document/session, drawing, render, history and base layers

## Sub-stages

1. `C2A`: normalize New/Open/imported and inserted live layers to one stable
   typed raster owner. It owns the existing sparse backing by reference, so the
   preparation stage neither copies pixels nor changes hot indexed access.
2. `C2B`: make Brush/Eraser/Smudge/Fill produce one `RasterEdit` and one
   byte-bounded `TileHistory` transaction against `RasterSurface`; replace the
   owner's backing only when those writers and their readers move together.
3. `C2C`: replace legacy composite/cache with `DocumentCompositor` and route
   base add/select/visibility/opacity/lock/reorder through one command owner.
4. `C2D`: connect typed session, autosave, New/Open cancellation, dirty state
   and persistence, then delete the superseded image/history owners.

Each sub-stage is a focused commit, leaves the editor usable and lowers the
registered JS/legacy-state ceiling only by the owners it actually removes.

## Sub-stage records

- `C2A`: done in this stage commit, `refactor: normalize live raster ownership`;
  117 legacy, 294 TypeScript and 51 performance tests pass. Live assignments,
  inserts, clones and reference Undo keep one stable non-serialized owner. An
  all-byte Proxy was rejected because it missed the A4 input budget.
- `C2B`: in progress.
- `C2C`: pending.
- `C2D`: pending.

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
