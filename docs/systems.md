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

До cutover `src/app.js` собирает старые JS systems вокруг глобального `S` и
pixel grids, включая pixelizer, tilemap и pixel-perfect. Это read-only
поведенческий oracle для полезных gallery/layer/selection/IO сценариев. Новая
system не импортирует legacy system и не пишет в legacy state.

После `R6` этот раздел заменяется сгенерированным индексом production systems.
