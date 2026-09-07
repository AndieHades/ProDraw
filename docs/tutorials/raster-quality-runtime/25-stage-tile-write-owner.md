# Stage `Q2B`: тайлы — единственная цель записи

- Status: `draft`
- Depends on: `Q2A`
- Requirements: `RQ-OWN-01`, `RQ-HIST-01`, `RQ-PERF-01`

## Scope

Снять двойную запись. Пиксель штриха пишется один раз — в тайл. `grid[y][x]`,
sparse `Proxy` и ячейка `[r,g,b,a]` уходят из продакшн-runtime. Undo переходит
на байтовый бюджет.

Это центральный этап плана: он снимает 93-кратный штраф записи, четырёхкратное
дублирование пикселя и восьмишаговую историю одновременно.

## Change map

| Путь | Изменение |
| --- | --- |
| `src/systems/draw/cells.js` | `createCellPainter` пишет только в тайлы |
| `src/core/raster/LegacyRasterSurfaceBacking.ts` | убрать `row[x] = value` |
| `src/core/raster/legacyRasterOwner.ts` | `grid` перестаёт быть публичным свойством слоя |
| `src/logic/sparse-grid.js` | удаляется |
| `src/logic/raster-grid.js` | остаётся только тайловый путь |
| `src/core/state.js` | `newLayerRecord` создаёт поверхность, не сетку |
| `src/core/history.js`, `src/core/history/*` | байтовый бюджет вытеснения |
| `src/config/limits.ts` | `historyCap` → бюджет в байтах |
| `src/systems/draw/fill.js`, `shapes.js`, `stamp.js` | запись через владельца |

## Contracts

- Запись пикселя не создаёт объект и не проходит через `Proxy`.
- `cellWrite()` с семью полями на пиксель исчезает; планировщик отдаёт
  типизированный батч по тайлам.
- `layer.grid` больше не существует как индексируемая структура в продакшне.
- Undo вытесняется по байтам: на `1920×1080` доступно не меньше `50` шагов при
  бюджете по умолчанию.
- `snapshot()` не клонирует неизменённые тайлы.

## Steps

1. Ввести типизированный батч записи: тайл, смещения внутри тайла, RGBA. Один
   батч на тайл на flush, без объекта на пиксель.
2. Переписать `createCellPainter`: аккумулятор непрозрачности пишет прямо в
   тайловый буфер редактирования; `base` Map заменяется на снимок затронутых
   тайлов, который и так нужен для отмены.
3. Убрать `row[x] = value` из `LegacyRasterSurfaceBacking.write`/`writeCells`
   и синхронизацию `syncLegacyGridTile` обратно в сетку.
4. Снять свойство `grid` со слоя в `normalizeLegacyRasterLayer`; оставить
   узкий адаптер только для модуля чтения старых документов.
5. Удалить `src/logic/sparse-grid.js` и его ветки в `raster-grid.js`.
6. Перевести `fill`, `shapes`, `stamp`, `adjust`, `recolor`, `mono` на батчи.
7. Заменить `historyCap` на бюджет в байтах в `src/config`; считать фактические
   байты обеих сторон патча; вытеснять по бюджету, а не по числу записей.
8. Убрать полный клон сеток из `snapState`: структурный снимок ссылается на
   неизменённые тайлы вместо копирования.
9. Обновить `docs/project/performance-budgets.md` новыми числами и запасом.

## Edge and failure cases

- `alphaLock` и `lock`: проверка идёт до записи в тайл, а не после.
- Симметрия и Tile Mode: зеркала и заворот вычисляются до батча, чтобы один
  пиксель не попадал в батч дважды.
- Отмена штриха в середине хода: `cancel` восстанавливает тайлы из снимка и
  не оставляет частично применённых батчей.
- Старые сохранённые документы со сжатой сеткой обязаны читаться; тест на
  документ, записанный до этапа.
- Слой нулевой площади и холст `1×1`: батч не должен делить на ноль.

## Persistence and rollback

Схема IndexedDB и `.psd` не меняются семантически, но путь записи меняется
полностью. Обязательны: round-trip старого документа, round-trip нового,
проверка recovery generation. Откат — revert коммита; `Q2A` остаётся рабочим
состоянием.

## i18n and assets

Новых строк нет.

## Checks

- Фокусные: `tests/core`, `tests/stroke`, `tests/state`, `tests/logic`.
- Перф: `legacyRasterBrushBudgets`, `sparseLayerBackingA4`,
  `layerBulkPixelCommands`, `textCallerHistoryA4`, `documentRemapA4`.
- `npm test`, `npm run check`, `npx eslint .`, `validate:cycles`,
  `validate:cutover`, `validate:lines`.
- `npm run package:mac`; рисовать, отменять, сохранять, переоткрывать.

## Acceptance criteria

- [ ] `git grep -n "grid\[" src` не находит продакшн-читателей и писателей.
- [ ] `src/logic/sparse-grid.js` удалён.
- [ ] Бюджет кисти 64 px держится с запасом не меньше четырёх крат.
- [ ] На `1920×1080` доступно не меньше `50` шагов Undo.
- [ ] Документ, сохранённый до этапа, открывается без потерь.

## Completion record

- Commit:
- Checks:
- Date:
