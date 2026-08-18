# Stage PBP-6: быстрые previews библиотеки

- Status: `completed`
- Depends on: `PBP-5`
- Requirement: `PBP-07`

## Scope

Убрать повторный тяжёлый decode/render всех видимых кистей при каждом открытии
компактной библиотеки. Первый cache miss остаётся background-работой; повторное
открытие и новый запуск используют сохранённые RGBA previews.

Вне scope: изменение внешнего вида карточки и QuickLook stroke.

## Change map

| Путь | Действие |
| --- | --- |
| `src/core/brush/BrushPreviewCache.ts` | versioned memory/persistent cache |
| `src/ui/brushes/renderBrushPreview.ts` | read/write готовых 80×80 RGBA |
| `src/ui/brushes/CompactBrushTile.ts` | cache hit до `actions.load` |
| `src/ui/brushes/BrushPreviewQueue.ts` | bounded observable scheduling |
| `tests/brush/` | hit/miss/invalidation/open-close coverage |

## Контракты и шаги

1. Ключ включает renderer version, `brush.id`, `revision` и source revision.
2. Карточка синхронно красит cache hit и не вызывает decoder.
3. Cache miss загружается только для видимой карточки; foreground selection
   сохраняет приоритет над preview queue.
4. Успешный render сохраняет ровно 80×80 RGBA; битая запись удаляется.
5. Cache bounded по числу/байтам, а storage failure не блокирует библиотеку.

## Edge, rollback и checks

- Удалённая/обновлённая кисть не получает preview старой revision.
- Закрытие панели отменяет pending jobs, но не очищает готовый cache.
- Отсутствующий local storage оставляет рабочий memory cache.
- Rollback возвращает lazy queue без persistent cache.

Проверки: focused preview tests, `npm run check`, targeted lint,
`validate:lines`, browser smoke открытия/закрытия панели.

## Acceptance criteria

- Второе открытие неизменённой 12-brush библиотеки вызывает 0 новых decodes.
- Cache hit отображается до первого idle callback.
- Неудачный preview одной кисти не задерживает остальные.

## Completion record

- Commit: this stage commit
- Checks: preview cache round-trip/corruption/revision and cache-hit-before-load
  tests; `npm run check`; targeted lint; lines; browser reopen smoke
- Date: 2026-08-18
