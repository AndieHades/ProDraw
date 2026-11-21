# Content fit residue plan

Status: `done`

- Owner: crop/trim content bounds
- Baseline: `asset-editor@7414639`, clean tree, 2026-11-20
- Stage: `CFR1`

## Evidence baseline

- `src/core/canvas-bounds.js#boundsFor` takes the first pixel with alpha > 0 in
  any layer or `ext` row. One faint pixel left by erasing the background keeps
  «Обрезать» and «Холст по всем слоям» at nearly the full canvas.
- Crop mode had no content fit; its frame starts at the canvas or selection.
- The Crop panel CSS lived in `tilemap-dialog.css` and was deleted with it in
  `20f946f`. Since then `#cropbar` renders in normal flow behind the canvas, so
  its size fields and Cancel/Apply cannot be reached by pointer.

## Target contract

- `CFR-01`: a pure function finds the bounds of meaningful content. Blobs are
  8-connected pixels with alpha > 0 over the max-alpha union of the layers,
  including off-canvas `ext`.
- `CFR-02`: a blob is residue when every pixel is at most `faintMaxAlpha`, or
  when it has at most `residueMaxPixels` pixels and no pixel above
  `residueMaxAlpha`. Values live in `src/config/content-fit.ts`.
- `CFR-03`: soft brush edges touch the artwork, belong to its blob and stay in
  the frame. Opaque pixels are never residue. If all content is residue, the
  raw bounds are used.
- `CFR-04`: both trim modes and the new Crop «По содержимому» button use the
  filtered bounds; layer and folder effects still grow them. Apply is the same
  single `applyCropRect` remap with one Undo step.
- `CFR-05`: bounded cost. Blobs are labelled over row runs, not pixels;
  scans above `maxScanPixels` or `maxScanRuns` fall back to raw bounds.
- `CFR-06`: the Crop panel is visible again at the bottom centre.

## Change map

1. `logic/raster/alphaPlane.ts`, `alphaComponents.ts`, `meaningfulBounds.ts`.
2. `core/canvas-bounds.js#contentFitBoundsFor` clips per-layer bounds to the
   meaningful frame before effect reach.
3. `systems/trim.js` and `systems/crop.js#fitCropToContent`; the frame keeps
   the RMB artwork offset (`idx`/`idy`).
4. `#crop-fit` button, ru/en labels, restored `styles/parts/crop-panel.css`.

## Risks

- Crop cuts a rectangle: residue inside the final frame (for example in the
  corners around a round artwork) stays on the canvas.
- Residue cut by Apply moves to `ext` like any cropped pixels; later trims
  ignore it by the same rule, so the canvas does not grow back.
- A deliberate tiny translucent detail apart from the artwork is treated as
  residue; Undo restores it in one step.

## Verification evidence

- `tests/logic/meaningfulBounds.test.ts`: specks, haze, soft and diagonal edges,
  cross-layer joins, packed rows, `ext`, fallbacks.
- `tests/system/contentFitResidue.test.js`: trim, effect reach, crop fit with a
  moved artwork, one Undo step.
- `tests/performance/contentFitTrim.test.js`: 12 MP erased photo trims in
  ~68 ms against the 500 ms `canvasTrimMilliseconds` budget. A painted sparse
  layer with 1.5 M cells: raw bounds 55 ms, filtered bounds 160 ms.
- `documentRemapA4`: trim now reads the two content rows once more for the
  analysis (4 reads instead of 2); empty A4 rows are still never read.
- Browser workflow on the dev server: 800×600 canvas with a soft circle and 80
  residue specks; «По содержимому» framed 279×279, Apply made one
  `document-remap-patch`, «Холст по всем слоям» kept 279×279, Undo restored.

## Resume Here

- Current stage: `CFR1`
- Status: done
- Last completed stage: `CFR1`
- Next action: user acceptance in the packaged app
- Blockers: none
- Working paths: `src/logic/raster`, `src/core/canvas-bounds.js`, crop/trim
- Last checks: check, lint, Vitest, performance, legacy, docs, lines, cycles,
  architecture, cutover, catalogs
- Last updated: 2026-11-20
