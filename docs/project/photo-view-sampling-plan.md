# Photo view sampling repair

Status: `done`; stage `PVS1`; one focused commit per defect.

- Owner: viewport presentation (`src/systems/render`) and PSD gallery import
- Baseline: `asset-editor@db6989f`, 2026-10-15, clean worktree
- User report: an opened JPG looks heavily pixelated; PSD opens with every
  folder expanded and sometimes with the layer stack reversed

## Evidence baseline

- JPG import (`GalleryImageImport.ts`, `insertImageTop`) keeps natural pixels;
  the import path is lossless.
- `systems/render/index.js` draws the whole `W×H` composite onto the viewport
  in one `drawImage` with `imageSmoothingQuality = 'high'`.
- In Chromium (the desktop runtime) that downscale is plain bilinear for every
  quality: a 4000×3000 canvas of 1px lines drawn at 0.225 gives luminance
  std 57 (moiré from 22 to 255), while a halving chain gives std 10 on the
  same area. Fit zoom of a photo is usually 0.1–0.4, so detail aliases.
- ag-psd builds `children` bottom-first (it walks records top-down and
  `unshift`s). `inferPsdStackOrder` defaulted to top-first whenever both
  directions composited identically, which is always the case for sprites that
  never overlap, so asset sheets opened reversed.
- `psd-record.js` copied the PSD folder flag (`opened`) into `folder.open`.

## Target contract

- `PVS-01`: when `zoom × devicePixelRatio ≤ 0.5` the viewport samples a level
  pre-reduced by 2×2 averaging, so the final bilinear step reduces at most 2×.
- `PVS-02`: levels are presentation only; document RGBA, history and export
  are untouched. Partial composite repaint updates only dependent level pixels.
- `PVS-03`: the decoded PSD tree is bottom-first by contract and is mapped
  directly to the runtime stack; there is no composite-based guess.
- `PVS-04`: every imported PSD folder opens collapsed.

## Change map

1. `logic/view/viewportMip.ts` — level choice and damage geometry (pure).
2. `core/render/ViewportMipChain.ts` — lazy level canvases, damage-limited
   refresh, reset on full repaint or resize.
3. `systems/render/index.js` — invalidates the chain with composite damage and
   draws the chosen level's exact source rectangle.
4. `contracts/psdImport.ts`, `core/psd/decodePsdDocument.ts`,
   `systems/gallery/psd-record.js` — drop `stackOrder`, delete
   `logic/psd/inferStackOrder.ts`, collapse folders.

## Risks and rollback

- Extra memory is at most one third of the composite and is allocated only
  after the user zooms below 50% device scale.
- A brush stroke at small zoom refreshes only its rectangle per level; a full
  composite fallback rebuilds the requested levels once.
- Rollback restores the single `drawImage` call and the stack-order guess; no
  persisted schema changes.

## Completion record

- Tests: `tests/logic/viewportMip.test.ts`,
  `tests/render/viewportMipChain.test.ts`, `tests/psd/psdStackOrder.test.js`.
- Browser proof: 4000×3000 JPEG at 22.5% renders without moiré; after a stroke
  only the stroke rectangle of the viewport changes, and the composite after a
  partial repaint is byte-identical to a full repaint.
- Checks: `npm run check`, targeted eslint, `validate:changed`
  (197 files / 589 tests), lines, cycles, architecture, cutover, desktop,
  raster-entry and shell-catalog gates.
- Not covered: layer-panel thumbnails and gallery tiles still downscale
  without filtering; physical Photoshop comparison is user-owned.
