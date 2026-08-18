# Stage PBP-8: persistent library и brush hotkeys

- Status: `completed`
- Depends on: `PBP-7`
- Requirements: `PBP-09`, `PBP-10`

## Scope

Сделать компактную библиотеку постоянным floating tool window и дать каждой
кисти назначаемое keyboard combo для быстрого выбора. Поле назначения находится
в Brush Studio над stylus diagnostic pad.

Вне scope: shortcuts для отдельных Brush/Smudge/Eraser slots и macro chains.

## Change map

| Путь | Действие |
| --- | --- |
| `src/ui/brushes/mountCompactBrushPanel.ts` | убрать outside-dismiss |
| `src/ui/brushes/BrushStudioPresenter.ts` | shortcut field над pad |
| `src/core/brush-library/BrushLibraryMetadata.ts` | shortcut ownership |
| `src/systems/keyboard/index.js` | dynamic brush combo dispatch |
| `src/contracts/shellActionCatalog.ts` | typed selection action |
| `src/i18n/raster/*BrushControls.ts` | label/conflict feedback |
| `tests/brush/`, `test/` | window и keyboard behavior |

## Контракты и шаги

1. Удалить `bindOutsidePointerDismiss` только у brush library; крестик и
   повторная команда Brush остаются явными способами закрытия.
2. Shortcut capture игнорирует чистые modifiers, normalizes combo тем же
   `comboOf`, что production keyboard system, и не срабатывает при вводе текста.
3. Apply переносит combo новому brush id и атомарно снимает его с прежнего.
4. Startup строит shortcut map только из существующих brushes.
5. Dynamic brush combo имеет определённый приоритет над default keymap и не
   пропускает событие дальше после успешного выбора.

## Edge, rollback и checks

- Escape/Tab/Delete не назначаются без явного разрешения; `B` можно вернуть
  стандартному Brush через очистку поля.
- Удаление кисти удаляет shortcut ownership.
- Недекодируемая кисть не ломает keyboard loop и остаётся на прежнем выборе.
- Rollback возвращает outside-dismiss и удаляет dynamic dispatch одним коммитом.

Проверки: focused presenter/metadata/keyboard tests, `npm run check`, targeted
lint, `validate:lines`, browser smoke с открытой библиотекой и canvas click.

## Acceptance criteria

- Клик по холсту не закрывает библиотеку; крестик закрывает.
- Назначенный combo выбирает кисть и survives restart.
- Один combo принадлежит максимум одной live кисти.

## Completion record

- Commit: this stage commit
- Checks: outside click/X callback, shortcut capture/conflict/restart/input guard,
  browser smoke назначения `3`, переключения и повторного запуска
- Date: 2026-08-18
