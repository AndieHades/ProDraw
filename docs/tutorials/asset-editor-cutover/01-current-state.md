# Current state

`index.html` starts `src/legacy-entry.js`, which imports the preserved shell
directly. The shell opens without a typed brush library or an externally
selected brush. The historical typed runtime remains outside the production
module graph while the cutover is verified.

The legacy drawing path routes `pencil`, `eraser` and `adjust` through
`systems/draw/tools.js`; a loaded brush uses `StrokePipeline` and the
Procreate-shaped renderer, while its fallback uses stamp masks. The same
brush state drives the Brush Bar, cursor preview, size hotkeys and tool menu.

PSD import is a lazy `ag-psd` workflow owned by `systems/import` and gallery
transactions. PSD/PNG exports compose the document independently of brushes.
`systems/flip.js` already remaps every document raster layer and retains their
names, order, visibility and opacity.
