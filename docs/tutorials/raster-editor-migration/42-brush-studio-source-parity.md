# Brush Studio source and control parity

- Status: `in_progress`
- Baseline: `main@c8f2381`, 2026-08-17
- Scope: bundled/imported Procreate brushes, Brush Studio, compact brush cards,
  Drawing Pad and the shared production brush renderer
- Reference: user screenshots for Lineart Taper, Shape, Grain, Rendering,
  Properties and Preview, 2026-08-17

## Confirmed current state

- `lineart.brush` and `lineart_long.brush` contain no `Shape.png` or
  `Grain.png`. Their archive points to `Brush-Pocket-Brick.png` and
  `Brush-Artery-Charcoal-Corse.jpg`.
- Other bundled brushes reference Procreate built-ins: hard/soft tips, Artery
  Ultra Soft, Haggard Oval, Cotton Paper and Charcoal Vine.
- The decoder resolves only embedded PNG files. Missing maps become `null`, so
  Studio is blank and renderer/card use a generic circle/noise fallback.
- The preset stores only three taper scalars, two grain scalars and two size
  limits. Screenshot controls cannot round-trip or affect pixels.

## Requirements

- `BSP-01`: every supported built-in source reference resolves to a deterministic
  owned coverage map; unsupported names remain explicit warnings.
- `BSP-02`: effective Shape and Grain are identical in Studio, Source Library,
  compact card, Drawing Pad, cursor and document rendering.
- `BSP-03`: Lineart pressure taper imports authored size, opacity, pressure, tip
  and animation values; editing them changes the rendered stroke.
- `BSP-04`: supported Shape controls cover input style, rotation, scatter,
  count, flips, roundness and filtering without enabled no-ops.
- `BSP-05`: supported Grain controls cover behavior, movement, scale, zoom,
  rotation, depth/minimum, jitter, offset, blend and filtering.
- `BSP-06`: Rendering, Properties and Preview values shown by Studio persist and
  are consumed by the shared renderer or preview presenter.
- `BSP-07`: Cancel leaves the source untouched; Apply writes a revisioned
  `.prodraw-brush` beside its base archive and survives restart.

## Stages and commit boundaries

### BSP-A — source truth (`complete`)

Resolve known Procreate built-in source identities, expose their names and maps,
remove generic fallbacks for those identities and freeze all 12 bundled source
inventories plus Lineart pixel/card goldens.

### BSP-B — editable rendering contract

Extend the version-1 preset compatibly, map archive values from the screenshots,
add controls and make Taper/Shape/Grain/Rendering/Properties alter production
pixels deterministically. Old preset files receive validated defaults.

### BSP-C — Preview and persistence evidence

Render the Preview tab with the same engine, verify Cancel/Apply and source
embedding round trips, run full validation and package/smoke Windows desktop.

## Failure and rollback

- One bad brush/source is isolated and labelled; it cannot block the library.
- Known built-ins never silently become a generic circle or random noise.
- Unknown Procreate-only fields stay in the compatibility report instead of
  appearing as working controls.
- Each stage is a separate commit and can be reverted without reverting the
  preceding `c8f2381` editor checkpoint.

## Acceptance evidence

- Archive fixtures assert Lineart source names and screenshot numeric values.
- Every bundled brush has non-empty effective Shape and Grain preview data.
- Pixel tests prove each exposed rendering control changes output and Undo/replay
  remains deterministic.
- UI tests prove source canvases, taper groups and Preview canvas are populated.
- Preset round-trip tests preserve all new fields and owned source maps.
- `npm run validate`, `npm run package:desktop` and packaged renderer smoke pass.

## Resume Here

- Current stage: `BSP-B`
- Status: `in_progress`
- Last completed: known built-in Shape/Grain source maps, names and Lineart
  raster goldens
- Next action: import, edit, persist and render the screenshot-backed Taper,
  Shape, Grain, Rendering and Properties controls
- Blockers: none; physical Huion trace remains separate F5 acceptance
- Working paths: `src/contracts/brush.ts`, `src/core/brush`, `src/logic/brush`,
  `src/ui/brushes`, `src/config/brushStudio.ts`, `tests/brush`
- Last checks: 24 brush files / 55 tests, TypeScript, targeted ESLint, bundle,
  docs, line-limit and dependency-cycle gates passed
- Last updated: 2026-08-17
