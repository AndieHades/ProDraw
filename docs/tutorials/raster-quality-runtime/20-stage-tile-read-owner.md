# Stage `Q2A`: тайлы — единственный источник чтения

- Status: `in_progress`
- Depends on: `Q1`
- Requirements: `RQ-OWN-01`, `RQ-PERF-01`

## Scope

Каждый читатель пикселей берёт данные у `LegacyRasterOwner`/`RasterSurface`
регионом тайлов. Запись пока остаётся двойной — её снимает `Q2B`. Продукт
остаётся полностью рабочим.

## Подэтапы

Замер на `asset-editor@c609a5f`: `81` двумерное индексное обращение к пикселям в
`30` живых модулях. Это не один коммит, поэтому этап делится по владельцам; один
подэтап — один коммит с фокусными тестами.

| Подэтап | Владелец | Файлов | Статус |
| --- | --- | ---: | --- |
| `Q2A-1` | плавающий фрагмент выделения одним draw (`layer-cache`, новый пакер) | 2 | done |
| `Q2A-1b` | подсветка перекраски читает регионом и кэшируется (`render/overlays`) | 2 | done |
| `Q2A-2` | выделение: `selection/{content,fragment,float,clipboard,model,pixel-transform,full-canvas}` | 7 | draft |
| `Q2A-3` | команды слоёв: `layers/{bulk-pixels,fill,reference-pixels}`, `layer-center`, `mono`, `recolor`, `free-rotate`, `layer-bake-grid` | 8 | draft |
| `Q2A-4` | текст, коррекции, эффекты, импорт: `text-grid-raster`, `draw/adjust`, `adjustment-preview`, `effects/convert`, `import/convert`, `logic/cleanup`, `logic/layer-effects`, `logic/flood`, `document` | 9 | draft |
| `Q2A-5` | счётчик обращений в `validate:cutover` и его предел в `project.config.json` | 2 | draft |

### Проверено и не требует изменений

`src/logic/raster.js`, `src/logic/sample.js` и `src/core/io.js` работают над
переданными сетками (импорт, чистая геометрия), а не над живым слоем, поэтому в
`Q2A` они не входят. Их владелец — `Q2A-4` и `Q6`.

## Change map

| Путь | Изменение |
| --- | --- |
| `src/core/layer-cache.js` | `layerCanvas`, `layerFloatCanvas`, `compositeAt` читают регионы |
| `src/core/composite.js` | `paintStack` не касается `grid` |
| `src/logic/raster-grid.js` | `gridBounds`, `cloneGrid`, `visitContent` идут через тайлы |
| `src/systems/gallery/record-clone.js` | сериализация из тайлов |
| `src/systems/export`, `src/systems/effects` | чтение регионом |
| `src/core/psd`, `src/systems/import` | импорт пишет тайлы напрямую |
| `tools/validate-cutover.mjs` | счётчик обращений `grid[` может только убывать |

## Contracts

- Любое чтение артворка проходит через `readRegion` или `getCell` владельца.
- `layerFloatCanvas` перестаёт использовать `fillRect(x, y, 1, 1)`: плавающий
  фрагмент попадает в буфер одним `putImageData` по своим границам.
- Число обращений `grid[` в `src` фиксируется в `project.config.json` и не
  может расти.

## Steps

1. Добавить в `LegacyRasterOwner` типизированный контракт чтения региона с
   явными границами и без материализации полного холста.
2. Перевести `layerCanvas` на этот контракт: убрать зависимость от
   `layerContentBounds` через `grid` и брать границы у поверхности.
3. Переписать `layerFloatCanvas`: собрать фрагмент в `Uint8ClampedArray` по его
   bounding box, положить одним `putImageData`, композитить поверх слоя.
4. Перевести `compositeAt` на `getCell` владельца без обхода `grid`.
5. Перевести `gridBounds`/`cloneGrid`/`visitContent` на тайловый обход; убрать
   ветку `sparseGridShape` из горячего пути, оставив её только в модуле чтения
   старых сохранённых документов.
6. Перевести сериализацию галереи и экспорт на регионное чтение.
7. Перевести PSD-импорт на прямую запись тайлов вместо сборки `grid`.
8. Добавить в `tools/validate-cutover.mjs` счётчик `grid[` и предел в
   `project.config.json`.

## Edge and failure cases

- Слой за границей холста (`layer.ext`): границы региона могут быть
  отрицательными; читатель обязан клампить и не терять запас.
- Пустой слой: `readRegion` на пустых тайлах не должен аллоцировать буфер.
- Документ больше `maxCanvasPixels`: чтение регионом обязано оставаться
  порционным и принимать `AbortSignal` там, где он уже есть.
- Маски и `psdEffects` читаются тем же путём и не теряют альфу.

## Persistence and rollback

Схема сохранения не меняется на этом этапе. Round-trip тест «сохранить,
перезагрузить, сравнить тайлы» обязателен для галереи и `.psd`.
Откат — revert коммита этапа.

## i18n and assets

Новых строк нет.

## Checks

- Фокусные тесты: `tests/core`, `tests/effects`, `tests/logic`, `tests/psd`,
  `tests/render`.
- `tests/performance/effectSurfacesA4`, `layerMergeA4`, `selectionMaskA4`,
  `packedPsdRowsA4` — сравнить с baseline `Q0`.
- `npm run check`, `npx eslint .`, `validate:cycles`, `validate:cutover`.
- `npm run package:mac`; открыть PSD, проверить слои, маски, эффекты, экспорт.

## Acceptance criteria

- [ ] Ни один продакшн-читатель не индексирует `grid[y][x]`.
- [ ] Плавающее выделение рисуется без `fillRect` на пиксель.
- [ ] Счётчик `grid[` зафиксирован и убыл.
- [ ] Перечисленные perf-фикстуры не хуже baseline `Q0`.
- [ ] PSD round-trip и галерея без регрессий.

## Completion record

- Commit:
- Checks:
- Date:
