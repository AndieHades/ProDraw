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

Текущая Windows/web-поставка временно запускает восстановленный оригинальный
shell по цепочке `index.html` → `src/legacy-entry.js` → `src/app.js`. Этот bridge
остаётся production-путём до завершения `F3-R/UI-R`: он сохраняет gallery,
layers, palette, reference и drag/drop, пока их владельцы по одному переводятся
на typed RGBA contracts. Его dense grid не является целевой моделью и не может
получать новые pixel-art зависимости.

Параллельный target runtime начинается в `src/main.ts` и
`src/app/RasterEditorApp.ts`. Там `RasterEditorSession` владеет изменяемыми
`RasterDocument`, `TileHistory`, viewport и выбранной кистью. UI отправляет
`EditorCommand` и получает скопированные editor/layer/canvas view models;
mutable document/history в presenters не передаются. После parity transfer эта
композиция заменит bridge за тем же оригинальным DOM, а не новым интерфейсом.

`src/core/brush-library` владеет загрузкой наборов и ревизиями нативных пресетов;
`src/ui/brushes` только отображает команды. В Windows `desktop/brush-ipc.mjs`
реализует allowlisted app-data операции: seed/list/read/atomic-write/trash и
директорные create/rename/move. Renderer не получает произвольный filesystem API.

`src/logic/stroke/StrokePipeline.ts` — единая чистая цепочка pressure response →
stabilization → spacing для документа и Drawing Pad. `DrawingSystem` открывает
одну `RasterEdit` на жест и направляет её либо в RGBA brush dab, либо в локальный
Smudge renderer; pointer-up добавляет фактическую конечную точку, а cancel
откатывает все затронутые tiles.

`DocumentWorkflow` владеет New/Open/Save/Save As, dirty revision и close guard.
`DocumentRepository` хранит несколько работ и две атомарные recovery-generation
на работу. Recovery v2 переиспользует неизменившиеся tile blobs и удаляет blobs
старше двух generation. `AutosaveSystem` сериализует порциями вне активного pen
edit, проверяет revision-consistency и coalesces новую ревизию. Native `.prodraw`
проходит через `DocumentFileSystem` и атомарный Windows file adapter.

`DocumentCompositor` владеет revision-aware LRU composite cache и вычисляет
только tiles в текущих viewport bounds. `CanvasPresenter` повторно использует
tile canvases до смены presentation revision. `TileHistory` ограничен числом
операций и retained bytes. Измерения и CI ceilings принадлежат
[`performance-budgets`](project/performance-budgets.md).

Архитектурные фикстуры запрещают DOM-типы в `src/contracts`, импорт mutable
document/persistence в UI и композицию target systems вне `src/app`. Временный
`src/app.js` вокруг глобального `S` проверяется legacy/module-int gates как
production recovery bridge; после доказанного parity transfer он становится
read-only oracle и удаляется только в R6.

После `R6` этот раздел заменяется сгенерированным индексом production systems.
