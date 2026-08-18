# Current State

Evidence was captured on clean `codex/layer-export-viewport-fixes@8e7faee`.

## PSD structure

- `src/systems/export/tree.js` correctly builds ProDraw's runtime stack
  bottom-first for compositing.
- `src/systems/export/psd.js` emits that same bottom-first traversal directly as
  PSD layer records. PSD readers expose record order as top-first, so the panel
  becomes the inverse of the visible stack at the root and inside groups.
- `encodeLayered` creates the embedded composite independently through
  `flattenNodes`; that explains why the initial canvas looks right even when the
  editable panel is wrong.
- `src/systems/export/psd-write.js` writes four RGBA channels but declares colour
  mode `4` (CMYK), while PSD RGB mode is `3`. The installed `ag-psd` decoder
  rejected the current output before an in-memory header correction.
- Existing tests prove only that a PSD blob exists. They do not decode an
  exported nested tree or compare its row order to the source export tree.

## Folder PNG

- `src/systems/layers/menu.js` exposes `lctx-png-full` and `lctx-png-tight` for
  layers and folders. Both flatten the clicked target through
  `exportTargetPng` in `src/systems/export/pipeline.js`.
- The general separate-file export can produce multiple downloads, but it loses
  directory hierarchy and does not own a one-choice Explorer transaction.
- `desktop/electron-ipc.mjs` saves one binary file. The preload has no bounded
  directory-export session, and the web adapter has no directory tree writer.

## Viewport quality

- The production recovery shell renders through `src/systems/render/index.js`.
  It sets `imageSmoothingEnabled = false` before scaling the complete source
  composite for every zoom level.
- At 100%, source and display pixels align. Below 100%, nearest-neighbour sample
  omission creates the reported broken detail instead of a filtered preview.
- The viewport matrix changes only `S.view`; the issue is presentation quality,
  not accumulated destructive resampling.

## Gap

The live paths have enough source data and hierarchy, but the PSD boundary uses
the wrong external ordering convention, multi-file output lacks a transactional
directory port, and viewport sampling ignores downscale quality.
