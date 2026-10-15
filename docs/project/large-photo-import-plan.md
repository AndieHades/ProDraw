# Large photo import

Status: `done`; stage `LPI1`; one focused commit.

- Owner: image import (`systems/gallery/doc.js`, `core/document.js`) on the
  packed raster contract (`logic/raster`)
- Baseline: `asset-editor@2c218eb`, 2026-10-15, clean worktree
- User report: dropping a 4000×3000 JPEG on the gallery sits in
  «Сохранение в галерею…» for 15–20 s

## Evidence baseline

Measured in the `prodraw-dev` preview (Vite, Chromium) with a generated
4000×3000 JPEG (4.5 MB, gradient plus noise, quality 0.9):

| Path | Step | Time | JS heap growth |
| --- | --- | --- | --- |
| gallery drop | `saving` stage (`newWorkFromImage`) | 32.2 s | +1.3 GB |
| gallery reopen | `openWork` of that document | 12.1 s | — |
| editor insert into 1600×1200 | `insertImageTop` | 10.6 s | +2.3 GB |
| editor insert into 1600×1200 | following `saveCurrent` | 26.3 s | (included) |

- `logic/importedImage.ts` writes every pixel with alpha > 0 as its own JS
  array into `layer.grid[y][x]`; `record-clone.js` then clones those 12 M
  arrays and IndexedDB structured-clones them again.
- `core/document.js` `addImageLayerTop` does the same and puts every pixel
  outside the canvas into `ext` as a `"x,y"` Map entry (10.08 M entries in the
  run above). It also silently drops pixels with alpha < 8, a pixel-art era
  rule from `a43ac42`.
- PSD import already avoids both: `psd-record.js` stores `rasterRows`
  (`rgba-rows-v1`) built by `packedRgbaRecordFromBitmap`, and
  `normalizeLegacyRasterLayer` turns them into a live packed grid.
  Persistence (`serializePackedRgbaGrid`), tile loading
  (`copyPackedRgbaTile`), history (`clonePackedRgbaGrid`) and canvas remap
  (`translatePackedRgba`, `PackedRasterExt`) all consume that grid without
  per-pixel objects.

## Target contract

- `LPI-01`: a gallery image import stores its only layer as a packed
  `rgba-rows-v1` grid; no per-pixel JS array is allocated. Every pixel with
  alpha > 0 keeps its exact RGBA; alpha 0 stays empty.
- `LPI-02`: PNG source binding is unchanged — `sourceFormat: 'png'` and the
  dropped location for PNG, `null` for other formats.
- `LPI-03`: the editor top-layer insert centres the image as a packed grid;
  pixels outside the canvas become `PackedRasterExt` spans. Alpha is exact:
  the alpha < 8 drop is removed so both import routes agree.
- `LPI-04`: autosave → IndexedDB → reopen returns identical pixels for both
  routes; Undo removes the inserted layer and Redo restores it unchanged.
- `LPI-05`: the 12 MP measurements above are repeated after the change and the
  saving stage, reopen and insert are each at least 10× faster.

## Change map

1. `logic/raster/packedImageRecord.ts` (new, pure) — a full-image packed
   record and its placement on a canvas through `translatePackedRgba`.
2. `logic/importedImage.ts` — assigns the packed grid instead of writing cells.
3. `core/document.js` `addImageLayerTop` — uses the placement for `grid` and
   `ext`.
4. `docs/systems.md` — runtime inventory names the import route.
5. Tests: `tests/logic/importedImage.test.ts`,
   `tests/logic/packedImageRecord.test.ts`,
   `tests/system/largeImageImportPersistence.test.js`.

`placeImageLayer` (`insertPixelImage`) is not reached from any UI path and is
out of scope.

## Decisions and risks

- Rows keep the RGB bytes of transparent pixels inside a row span, exactly as
  PSD rows do; readers treat alpha 0 as empty, so visible pixels and export
  are unaffected.
- Peak transient memory for the insert route is the decoded buffer plus two
  packed copies (about 150 MB for 12 MP) instead of gigabytes of objects.
- No schema change: old documents with cell grids still load through the
  existing sparse path. Rollback is a revert of this commit.

## Completion record

Same preview, same generated JPEG, fresh dev server:

| Path | Step | Before | After |
| --- | --- | --- | --- |
| gallery drop | `saving` stage | 32.2 s, +1.3 GB | 0.45 s, +0.2 GB |
| gallery drop | whole import to `opening` | 32.3 s | 0.56 s |
| gallery reopen | `openWork` | 12.1 s | 0.27 s |
| editor insert | `insertImageTop` | 10.6 s, +2.3 GB | 0.23 s |
| editor insert | first `saveCurrent` | 26.3 s | 0.06–1.8 s |
| editor insert | warm `saveCurrent` | — | 0.13 s |

The first save after an insert varies with the garbage collection of the
decoded buffer; the clone, preview and IndexedDB put themselves take 13, 9
and 59 ms. Undo of the insert takes 12 ms and Redo 32 ms.

- Browser proof: after reopening, 1 334 000 sampled pixels of the gallery
  photo and 343 200 sampled pixels of the inserted layer (inside the canvas
  and in `ext`) equal a fresh decode of the same JPEG.
- Tests: `tests/logic/importedImage.test.ts`,
  `tests/logic/packedImageRecord.test.ts`,
  `tests/system/largeImageImportPersistence.test.js`; the system test fails
  on `2c218eb` (cell grid instead of `rasterRows`, alpha 1 dropped).
- Checks: `npm run check`, targeted eslint, `git diff --check`,
  `npm run validate:changed`.
- Not covered: packaged `/Applications/ProDraw.app` was not rebuilt; the
  numbers come from the Vite dev runtime.

## Resume Here

- Current stage: `LPI1`
- Status: `done`
- Last completed stage: `LPI1`
- Next action: none; desktop delivery only on request
- Blockers: none
- Working paths: see change map
- Last checks: see completion record
- Last updated: 2026-10-15
