# Карта систем

## Target systems

| Owner | Один процесс |
| --- | --- |
| drawing | actual pen samples → stabilized stroke → RGBA tile patches |
| layers | layer tree commands and selection |
| viewport | pan/zoom/rotate presentation matrix |
| transform | immutable-source matrix preview and one Apply |
| liquify | displacement-field editing and one Apply |
| brush-library | manifest/decode/persistence/compatibility |
| document-library | atomic save/reopen/gallery thumbnails |
| import/export | typed interchange and failure reports |

Точные target contracts и этапы находятся в
[`raster-editor-migration`](tutorials/raster-editor-migration/README.md).

## Legacy inventory

`src/main.ts` и `src/app/RasterEditorApp.ts` собирают текущие drawing, viewport,
autosave и export systems. Они работают через `RasterDocument`, `TileHistory`,
platform port и presenters. Старый `src/app.js` вокруг глобального `S` больше не
загружается и остаётся read-only oracle для будущего parity transfer.

После `R6` этот раздел заменяется сгенерированным индексом production systems.
