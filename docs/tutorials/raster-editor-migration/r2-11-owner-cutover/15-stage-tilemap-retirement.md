# User scope correction: retire tilemap/tileset

- Status: `implemented`
- Decision date: 2026-08-17
- Commit: `refactor: retire tilemap suite` (this stage commit)

## Product boundary

Remove the dedicated tilemap editor and tile library: tilesets, palette,
variants, cell selection, tile brush, map creation/edit/export and pixel-layer
conversion. Remove their buttons, menus, shortcuts, i18n, styles, state,
history branches, persistence fields and tests.

Keep the main toolbar `Режим тайла` / `Tile Mode`. It is a separate raster view
workflow: seamless 3×3 canvas preview plus wrapped drawing. Generic raster tile
storage (`RasterSurface`, `TileHistory`, tile byte/address helpers) also remains;
it is an implementation detail of the RGBA engine, not the removed feature.

## Data migration

Old saved tilemap layers retain a cached RGBA `grid`. On open, normalize these
layers, including stored animation frames, to `kind: pixel`; preserve `grid` and
`ext`, then remove `tilemap`, `tilemapSettings`, `tilesets` and `tilesetSeq`.
The next save persists the ordinary pixel document.

## Implementation inventory

- detached all tilemap mounts and action/event contracts from production;
- removed feature core/logic/systems/config/styles/locales and obsolete docs;
- collapsed crop, rotate, flip, selection, layers, history and gallery paths to
  the ordinary raster/text contracts;
- reduced the enforced JS cutover ceilings from 313/200 to 285/175;
- removed feature-only legacy tests and added explicit migration coverage.

## Verification

- TypeScript check and legacy unit/integration/boot suites;
- TypeScript and performance suites;
- architecture, cycles, line, cutover, interface and shell-catalog gates;
- full validation, production build and Windows desktop package;
- browser smoke confirms Tile Mode remains and tilemap/library UI is absent.

## Completion record

- Commit: `refactor: retire tilemap suite` (this stage commit)
- Checks: check, lint, 118 legacy unit, 393 integration, storage/boot, 222
  TypeScript, 55 performance, architecture, cycles, cutover, interface,
  shell-catalog, line limits, desktop build/package/smoke and live browser smoke.
- Full `validate` passed every code/test phase and stopped at `validate:docs`
  only because an unrelated concurrently created untracked
  `docs/tutorials/procreate-brush-parity/` plan still had missing links. The
  task-owned documentation passed before that external tree appeared.
- Residual risk: one-way migration trusts the saved cached RGBA raster; corrupt
  legacy records without that cache cannot reconstruct deleted tileset content.
