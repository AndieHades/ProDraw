# Stage R2: Playable Raster Cutover

- Status: `planned`
- Depends on: `R1`
- Requirements: `RST-01`, `BRH-01`, `CAN-01`, minimum `DOC-01`, `CUT-01`
- Planned commit: `feat: cut over to raster painting core`

## Outcome

The production entrypoint creates large RGBA documents and lets the user draw
with bundled brushes, layers and undo, then save and export exact-size PNG.

## Ownership

- contracts: document/layer/tile/stroke/brush/view models;
- logic: stroke interpolation, pressure curves, dirty bounds and memory budgets;
- core: lazy tile surface, tile-patch history, composite and brush decode;
- systems: drawing, layers, viewport, create/export/autosave;
- UI: workspace, preset dialog, tool/brush/layer panels and status.

## Steps

- `R2.1` Implement lazy RGBA tiles and patch history with deterministic tests.
- `R2.2` Implement typed document store and composite visible layers.
- `R2.3` Decode build-manifest `.brush` archives with per-brush isolation.
- `R2.4` Render antialiased shape/soft procedural fallback, grain and opacity.
- `R2.5` Connect coalesced pointer samples, pressure size/opacity and eraser.
- `R2.6` Connect layers, undo/redo and non-destructive pan/zoom/rotate view.
- `R2.7` Add exact required canvas presets/custom validation and PNG export.
- `R2.8` Cut `index.html` to the TS app; remove pixelizer from runtime UI.
- `R2.9` Add current-format autosave/reopen and browser/desktop smoke.

## Edge cases

Invalid brush falls back without blocking catalog; drawing cannot edit a hidden
or locked layer; pointer cancel restores the open history transaction; oversized
custom documents explain the pixel/memory limit; export never changes artwork.

## Checks and acceptance

Each required preset creates exact dimensions/DPI. Each of 12 entries selects
and leaves a non-empty RGBA dirty region. Undo restores identical tile bytes;
redo restores the stroke. No app entrypoint imports pixelizer/grid/tilemap.

## Completion record

- Commit/checks/deviations: pending
