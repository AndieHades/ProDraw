# Stage R2: Playable Raster Cutover

- Status: `in_progress`
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
  The restored original dialog now consumes the same canonical preset data as
  TypeScript and contains no Sprite/Frame categories.
- `R2.8` Cut `index.html` to the TS app; raster engine ✅, original UI parity ❌
- `R2.9` Add current-format autosave/reopen and browser/desktop smoke. ✅
- `R2.10` While the approved legacy shell remains mounted, coalesce presentation
  to one animation frame, preserve fractional/coalesced pen samples and update
  only the brush dirty rectangle instead of rebuilding the full W×H layer. ✅
- `R2.11` Remove the temporary grid-backed document seam entirely: the restored
  layer/gallery/reference UI must become a view/controller over `RasterDocument`,
  `RasterSurface` and byte-bounded tile history. This owns the remaining full
  snapshot on legacy-shell pointer-down and is required before R2 can close.
- `R2.12` Store built-in canvas names as locale keys and update every visible
  preset immediately on RU/EN switch while preserving user-authored names. ✅
- `R2.13` Replace the legacy shell's full-canvas snapshot for brush and Smudge
  gestures with a reversible touched-pixel patch; A5 pointer-down must remain
  proportional to the stroke footprint rather than document area. ✅
- `R2.14` Keep A5 interaction proportional to changed pixels: reuse the
  committed composite for cursor/view-only frames, combine repeated dab hits,
  cap production `.01` spacing to a continuous raster-safe interval, defer
  gallery autosave until pen-up and keep layer revisions local. ✅
- `R2.15` Restore source-faithful Screentone and cursor output: retain native
  2048 px Grain, area-filter the Procreate `textureScale / 16` periodic tile,
  apply inversion/contrast/brightness, recognize bundled hard/soft/brick/oval
  shape identities, and draw a transparent alpha-boundary cursor with holes
  and islands instead of a filled disc. ✅ automated; manual Huion check pending
- `R2.16` Every user-created canvas starts with a visible white Background;
  imported and reopened documents preserve their authored transparency. ✅

## Edge cases

Invalid brush falls back without blocking catalog; drawing cannot edit a hidden
or locked layer; pointer cancel restores the open history transaction; oversized
custom documents explain the pixel/memory limit; export never changes artwork.

## Checks and acceptance

Each required preset creates exact dimensions/DPI. Each of 12 entries selects
and leaves a non-empty RGBA dirty region. Undo restores identical tile bytes;
redo restores the stroke. No app entrypoint imports pixelizer/grid/tilemap.
The visually selected persisted brush is loaded before the first stroke, and a
production-shell A4 trace must not rebuild a full-size layer per pointer sample.
Brush/Smudge undo on A5 stores only first-before values for touched pixels.
Pointer hover never rebuilds the committed W×H composite. Screentone and Net
Screentone repeat at their archive-derived periods (about 10 px and 12 px), and
the brush cursor contains contour strokes only—no filled preview pixels.

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
- Commits: tiled raster foundation (`a040fc4`), production raster cutover
  (`c89e78c`).
- Product acceptance revoked on 2026-08-16: `c89e78c` removed 538 lines of the
  approved interface while replacing the runtime. Recovery is owned by
  [`08-interface-feature-parity.md`](08-interface-feature-parity.md); the RGBA
  engine stays, but the original shell and all non-pixelizer functions return.
