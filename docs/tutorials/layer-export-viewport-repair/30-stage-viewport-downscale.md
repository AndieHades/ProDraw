# LEP3: High-quality Viewport Downscale

- Stable id: `LEP3`
- Status: `done`
- Depends on: `LEP2`
- Requirements: `LEP-VIEW-01`

## Change map

- `src/logic/view`: pure presentation-sampling decision.
- `src/systems/render/index.js`: set smoothing immediately before the scaled
  composite draw and restore overlay behavior afterwards.
- focused tests: below/exact/above 100% policy and source-state invariance.

## Steps

1. Express the smoothing threshold as a pure function of view scale.
2. Enable `imageSmoothingEnabled` and high quality only for downscale draws.
3. Keep the offscreen source composite exact-size and unsmoothed.
4. Preserve current tile repeat, clipping, grid, overlay and brush-cursor order.
5. Verify wheel zoom changes view state only and 100% keeps smoothing disabled.

## Failure and edge cases

Invalid zoom falls back safely. Very small legal zoom remains filtered. Tile mode
uses the same complete source composite, so each repeated downscale is identical.
Grid and vector overlays are drawn after the raster and are not blurred.

## Acceptance

- A downscaled draw records high-quality smoothing before `drawImage`.
- A 100% draw records smoothing disabled and identical source dimensions.
- Repeated zoom-out/in leaves layer bytes and document history unchanged.

## Completion record

- Commit: this stage commit (`fix: improve zoomed out canvas quality`).
- Checks: 398 module integration tests; viewport policy 1 file/1 test;
  TypeScript check and targeted render/test ESLint.
- Residual risk: subjective physical display comparison is a manual supplement,
  not a replacement for the sampling/state assertions.
