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

## Current runtime inventory

`src/main.ts` и `src/app/RasterEditorApp.ts` — единственная точка композиции
drawing, viewport, autosave и export systems. `RasterEditorSession` владеет
изменяемыми `RasterDocument`, `TileHistory`, viewport и выбранной кистью. UI
отправляет `EditorCommand` и получает скопированные editor/layer/canvas view
models; mutable document/history в presenters не передаются.

`src/core/brush-library` владеет загрузкой наборов и ревизиями нативных пресетов;
`src/ui/brushes` только отображает команды. В Windows `desktop/brush-ipc.mjs`
реализует allowlisted app-data операции: seed/list/read/atomic-write/trash и
директорные create/rename/move. Renderer не получает произвольный filesystem API.

`src/logic/stroke/StrokePipeline.ts` — единая чистая цепочка pressure response →
stabilization → spacing для документа и Drawing Pad. `DrawingSystem` открывает
одну `RasterEdit` на жест и направляет её либо в RGBA brush dab, либо в локальный
Smudge renderer; pointer-up добавляет фактическую конечную точку, а cancel
откатывает все затронутые tiles.

Архитектурные фикстуры запрещают DOM-типы в `src/contracts`, импорт mutable
document/persistence в UI и композицию runtime systems вне `src/app`. Старый
`src/app.js` вокруг глобального `S` не загружается и остаётся read-only oracle до
явного parity transfer и удаления в R6.

После `R6` этот раздел заменяется сгенерированным индексом production systems.
