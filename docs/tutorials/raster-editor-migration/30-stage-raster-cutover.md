# Stage R2: Playable Raster Cutover

- Status: `done`
- Depends on: `R1`
- Requirements: `RST-01`, `BRH-01`, `CAN-01`, minimum `DOC-01`, `CUT-01`
- Planned commits: `feat: add tiled raster document core`, then
  `feat: cut over to raster painting core`

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

- `R2.1` Implement lazy RGBA tiles and patch history with deterministic tests. ✅
- `R2.2` Implement typed document store and composite visible layers. ✅
- `R2.3` Decode build-manifest `.brush` archives with per-brush isolation. ✅
- `R2.4` Render antialiased shape/soft procedural fallback, grain and opacity. ✅
- `R2.5` Connect coalesced pointer samples, pressure size/opacity and eraser. ✅
- `R2.6` Connect layers, undo/redo and non-destructive pan/zoom/rotate view. ✅
- `R2.7` Add exact required canvas presets/custom validation and PNG export. ✅
- `R2.8` Cut `index.html` to the TS app; remove pixelizer from runtime UI. ✅
- `R2.9` Add current-format autosave/reopen and browser/desktop smoke. ✅

## Edge cases

Invalid brush falls back without blocking catalog; drawing cannot edit a hidden
or locked layer; pointer cancel restores the open history transaction; oversized
custom documents explain the pixel/memory limit; export never changes artwork.

## Checks and acceptance

Each required preset creates exact dimensions/DPI. Each of 12 entries selects
and leaves a non-empty RGBA dirty region. Undo restores identical tile bytes;
redo restores the stroke. No app entrypoint imports pixelizer/grid/tilemap.

## Completion record

- R2.1: lazy 256×256 RGBA tiles, straight-alpha source-over/erase,
  per-surface layer ownership and byte-exact tile-patch undo/redo are complete.
  Focused evidence: strict check, ESLint, 12 TS tests, line and cycle validators.
- R2.2–R2.9: TypeScript entrypoint, typed layer document/compositor, 12-asset
  brush catalog with isolated archive fallbacks, antialiased pressure strokes,
  pen eraser, non-destructive view, exact presets, DPI-tagged PNG and IndexedDB
  round trip are complete.
- Evidence: full repository validate; 25 TS tests and 128 retained legacy logic
  tests; A4 2480×3508 @300 DPI browser creation, continuous drag, undo, all 12
  previews and PNG status; packaged `ProDraw.exe --smoke-test` passed.
- Deviation: old DOM-coupled module-int/module-boot suites are retained only as
  pre-cutover oracle and are no longer default gates. Brush folder writes,
  duplicate/delete, Studio and stabilization remain correctly owned by R3.
