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

Текущая Windows/web-поставка запускает восстановленный оригинальный shell по
измеряемой migration-цепочке `index.html` → `src/legacy-entry.js` → `src/app.js`.
Это не вторая допустимая архитектура: `R2.11/C1-C6` сохраняют тот же интерфейс,
переводят всех его владельцев на typed RGBA contracts и затем удаляют цепочку.
Её dense grid не является целевой моделью и не может получать новые pixel-art
зависимости.

Параллельный target runtime начинается в `src/main.ts` и
`src/app/RasterEditorApp.ts`. Там `RasterEditorSession` владеет изменяемыми
`RasterDocument`, `TileHistory`, viewport и выбранной кистью. UI отправляет
`EditorCommand` и получает скопированные editor/layer/canvas view models;
mutable document/history в presenters не передаются. После parity transfer эта
композиция заменит bridge за тем же оригинальным DOM, а не новым интерфейсом.

`project.config.json.cutover` объявляет живой entrypoint, target entrypoint,
текущий этап и невозрастающие пределы production JS/legacy-state модулей.
`validate:cutover` строит достижимый production-граф и отклоняет ложный live
target, второй runtime или рост этих пределов.

`src/core/brush-library` владеет загрузкой наборов и ревизиями нативных пресетов;
`src/ui/brushes` только отображает команды. В Windows `desktop/brush-ipc.mjs`
реализует allowlisted app-data операции: seed/list/read/atomic-write/trash и
директорные create/rename/move. Renderer не получает произвольный filesystem API.
Все privileged IPC handlers проходят общий exact-origin/exact-file sender guard,
а двоичные brush payload передаются как `ArrayBuffer`, без `number[]` amplification.

`src/logic/stroke/StrokePipeline.ts` — единая чистая цепочка pressure response →
stabilization → spacing для документа и Drawing Pad. `DrawingSystem` открывает
одну `RasterEdit` на жест и направляет её либо в RGBA brush dab, либо в локальный
Smudge renderer; pointer-up добавляет фактическую конечную точку, а cancel
откатывает все затронутые tiles.
Spacing накапливает пройденную дистанцию между actual/coalesced samples: частота
Windows Ink не создаёт лишний полный dab, пока перо не прошло следующий
авторский интервал. Recovery bridge объединяет opacity в локальных 32×32 tiles,
а contour cursor скрыт только во время активного штриха, чтобы тяжёлый dab не
показывал запоздавший контур в предыдущей координате.

`DocumentWorkflow` владеет New/Open/Save/Save As, dirty revision и close guard.
`DocumentRepository` хранит несколько работ и две атомарные recovery-generation
на работу. Recovery v2 переиспользует неизменившиеся tile blobs и удаляет blobs
старше двух generation. `AutosaveSystem` сериализует порциями вне активного pen
edit, проверяет revision-consistency и coalesces новую ревизию. Native `.prodraw`
проходит через `DocumentFileSystem` и атомарный Windows file adapter.

PSD picker и window drop используют один lazy-loaded `ag-psd` adapter. Decode
завершается до смены активной работы; gallery transaction сохраняет прежний
документ, атомарно создаёт отдельную запись и только затем открывает её. DPI,
Unicode tree, alpha, masks, clipping, blend/effect metadata переживают reopen;
маски применяются до clipping/эффектов, Photoshop blend modes проходят через
явный Canvas/pure-RGBA mapping, а isolated/pass-through группы собираются общим
композитором. Самодостаточные эффекты остаются неразрушающими строками слоя;
неточные эквиваленты и внешние pattern-ресурсы дают сохранённое предупреждение.
Layered PSD export keeps the internal bottom-first stack unchanged, but emits
top-first PSD records recursively so external layer panels and the independently
generated embedded composite describe the same visual order. Four-channel
exports declare RGB plus alpha rather than CMYK.

`DocumentCompositor` владеет revision-aware LRU composite cache и вычисляет
только tiles в текущих viewport bounds. `CanvasPresenter` повторно использует
tile canvases до смены presentation revision. `TileHistory` ограничен числом
операций и retained bytes. Измерения и CI ceilings принадлежат
[`performance-budgets`](project/performance-budgets.md).

Live recovery-shell viewport хранит точный offscreen composite: при zoom ниже
100% только итоговый presentation draw использует high-quality smoothing, а на
100% фильтрация выключена. После raster draw режим сбрасывается до оверлеев;
масштабирование не меняет RGBA или history.

В recovery bridge эффект `monochrome` использует тот же чистый Rec.601 helper,
что разрушающая операция, но хранится в generic effect stack слоя/папки и не
меняет source pixels. Быстрый PNG слоя и папки строит один visibility-filtered
export root и проходит через общий `paintStack`; whole-canvas/trim поэтому
учитывают включённые эффекты и берут имя из выбранного слоя или папки. Третья
folder-only команда «Сохранить слои в PNG» включает скрытые листья, планирует
уникальные безопасные пути и пишет один full-canvas PNG на слой с подпапками.
Windows IPC ограничивает запись staging-каталогом с последующей публикацией.
Тот же stack хранит `adjustment`: из панели эффектов он открывается как
«Яркость/контраст» в отдельном окне с двумя live-ползунками. Первый клик выбирает
его строку, повторный открывает сохранённые параметры; расширенные тон и
насыщенность остаются только в совместимом canvas-adjustment contract.

Архитектурные фикстуры запрещают DOM-типы в `src/contracts`, импорт mutable
document/persistence в UI и композицию target systems вне `src/app`. Временный
`src/app.js` вокруг глобального `S` проверяется legacy/module-int gates как
production recovery bridge; после доказанного parity transfer он становится
read-only oracle и удаляется только в R6.

После `R6` этот раздел заменяется сгенерированным индексом production systems.
