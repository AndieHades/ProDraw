# Stage `Q7`: удаление параллельного редактора и финальные гейты

- Status: `draft`
- Depends on: `Q6`
- Requirements: `RQ-OWN-02`, `RQ-GATE-01`, `RQ-PAR-01`

## Scope

Удалить второй редактор и всё, что осталось без потребителя после `Q6`.
Удаление отделено от cutover намеренно: до этого этапа откат возможен одним
revert.

## Change map

| Путь | Изменение |
| --- | --- |
| `src/raster-main.ts`, `src/main.ts` | удаляются |
| `src/app/RasterEditorApp.ts`, `RasterEditorSession.ts`, `DocumentWorkflow.ts` | удаляются, если их роль занял продакшн-корень |
| `src/app/mountCompactBrushLibrary.ts`, `createInitialDocument.ts` | удаляются или сливаются с корнем |
| `src/ui/canvas/CanvasPresenter.ts`, `src/ui/workspace`, `src/ui/document`, `src/ui/layers` | удаляются, если дублируют живые презентеры |
| `src/i18n/raster/*` | сливается с основным словарём |
| `tests/` | тесты удалённых модулей удаляются вместе с ними |
| `project.config.json` | `maximumSourceJavaScriptFiles: 0` |

Модули кистей (`src/core/brush*`, `src/logic/brush`, `src/ui/brushes`,
`src/platform/brush`, `src/app-folders/brushes`) **не удаляются**: после `Q4`
они принадлежат продакшну.

## Contracts

- Удаляется только то, что после `Q6` не имеет ни одного импортёра.
- Каждый удалённый модуль либо не имел покрытия, либо его поведение доказано
  тестом продакшн-пути.
- `RQ-PAR-01` полностью зелёный до первого удаления.
- Гейты запрещают возврат второй точки входа и `.js` в `src`.

## Steps

1. Построить граф достижимости от продакшн-корня; получить точный список
   модулей без импортёров.
2. Сверить список с `RQ-PAR-01`: ни одна строка не должна зависеть от
   удаляемого модуля.
3. Удалить модули и их тесты одним коммитом на смысловую группу.
4. Слить `src/i18n/raster` с основным словарём, сохранив ключи `ru` и `en`.
5. Понизить `maximumSourceJavaScriptFiles` до `0` и включить проверку
   «в `src` нет `.js`».
6. Обновить `docs/systems.md`, `docs/architecture.md`,
   `docs/project/roadmap.md` и `r2-11-owner-cutover` под фактическое состояние.
7. Пересчитать размер бандла и `index.html`; при превышении порога Vite
   вынести тяжёлые ветки в отдельные чанки.

## Edge and failure cases

- Модуль без импортёров, но с ценным поведением: не удаляется молча; либо
  подключается, либо переносится в план с записанной причиной.
- Тест, покрывающий только удалённый модуль: удаляется вместе с ним; если он
  покрывал продукт — переписывается на продакшн-путь до удаления.
- Ссылка из документации на удалённый путь: `validate:docs` обязан упасть, а не
  пропустить.

## Persistence and rollback

Схема не меняется. Откат — revert коммита группы; продукт после `Q6` рабочий.

## i18n and assets

Слияние словарей не должно терять ключи: тест на полноту `ru`/`en` до и после.

## Checks

- `npm test`, `npm run validate`, `npm run build`.
- `validate:cutover`, `validate:raster-entry`, `validate:cycles`,
  `validate:docs`, `validate:lines`, `validate:architecture`.
- `npm run package:mac`; полный ручной проход `RQ-PAR-01`.

## Acceptance criteria

- [ ] В `src` нет `.js` и нет второй точки входа.
- [ ] Нет модулей без импортёров, кроме явно записанных исключений.
- [ ] Словари `ru` и `en` полны.
- [ ] Все гейты зелёные, бандл в пределах порога.
- [ ] Пользователь принял собранное приложение.

## Completion record

- Commit:
- Checks:
- Date:
