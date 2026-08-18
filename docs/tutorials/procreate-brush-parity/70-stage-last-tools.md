# Stage PBP-7: последняя кисть и активный цвет

- Status: `planned`
- Depends on: `PBP-6`
- Requirement: `PBP-08`

## Scope

Восстанавливать после перезапуска последнюю реально выбранную кисть и последний
активный RGB. Контракт действует одинаково в Vite/web development runtime и в
Windows desktop.

Вне scope: документная palette, история использованных цветов и отдельные
кисти по режимам Brush/Smudge/Eraser.

## Change map

| Путь | Действие |
| --- | --- |
| `src/core/brush-library/BrushLibraryMetadata.ts` | сохранённый active id |
| `src/platform/brush/BrowserBrushLibraryState.ts` | web state adapter |
| `src/app/mountCompactBrushLibrary.ts` | desktop/web state wiring |
| `src/core/color-prefs.js` | guarded RGB load/save |
| `src/core/state.js`, `src/app.js` | startup restore и mutation events |
| `tests/brush/`, `test/` | round-trip/failure/restart coverage |

## Контракты и шаги

1. Выбор кисти атомарно обновляет `activeBrushId`; web использует local storage,
   desktop — существующий brush state file.
2. Startup активирует сохранённую кисть только после проверки live catalog.
3. Удалённый id даёт `lineart`, затем первую доступную кисть, и переписывает
   preference.
4. RGB валидируется как три целых числа `0..255`; всё остальное отбрасывается.
5. Все реальные пути изменения `S.active` публикуют событие, которое сохраняет
   preference; загрузка документа не превращает цвет в document-owned setting.

## Edge, rollback и checks

- Недоступный storage не мешает рисованию.
- Rapid selection сохраняет последнее значение после завершения очереди write.
- Corrupt JSON и удалённая кисть покрыты failure tests.
- Rollback удаляет только app-preference adapters, не документные данные.

Проверки: metadata/color preference round-trip, module boot, `npm run check`,
targeted lint, `validate:lines`, desktop/web restart smoke.

## Acceptance criteria

- После перезапуска выбрана последняя кисть и ею можно сразу рисовать.
- Последний RGB виден в active swatch и применяется к следующему stroke.
- Удаление сохранённой кисти не ломает startup.
- На чистом first run активируется `lineart`.

## Completion record

- Commit:
- Checks:
- Date:
