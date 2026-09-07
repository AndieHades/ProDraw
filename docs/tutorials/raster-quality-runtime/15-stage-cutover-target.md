# Stage `Q1`: исправленная цель cutover

- Status: `done`
- Depends on: `Q0`
- Requirements: `RQ-OWN-02`

## Scope

Привести зафиксированную цель миграции в соответствие с продуктом: целью
перестаёт быть `src/raster-main.ts` / `RasterEditorApp`. Только документы,
конфигурация и валидаторы; продакшн-код не меняется.

## Change map

| Путь | Изменение |
| --- | --- |
| `project.config.json` | `cutover.targetEntry` → `src/app/mountProductionShell.ts` |
| `tools/validate-raster-entry.mjs` | проверяет новый корень, а не `RasterEditorApp` |
| `tools/validate-cutover-fixtures.mjs` | фикстуры под новую цель |
| `docs/tutorials/raster-editor-migration/r2-11-owner-cutover/README.md` | `C6A`/`C6B` → `superseded`, ссылка сюда |
| `docs/project/roadmap.md` | указывает на этот пакет как на текущий control plane |
| `docs/tutorials/README.md`, `docs/index.md` | регистрация пакета |

## Contracts

- Целевая точка входа — TypeScript-корень, монтирующий сохранённую оболочку.
- `validate:raster-entry` отклоняет возврат `legacy-entry.js` как цели и
  отклоняет `RasterEditorApp` как продакшн-корень.
- Ни один валидатор не утверждает, что цель достигнута, пока `index.html` не
  грузит новый корень.

## Steps

1. Завести имя целевого корня `src/app/mountProductionShell.ts` как контракт;
   сам файл создаётся в `Q6`, поэтому валидатор до тех пор проверяет
   «цель объявлена и не равна `RasterEditorApp`», а не существование файла.
2. Переписать `tools/validate-raster-entry.mjs` под этот контракт.
3. Обновить `tools/validate-cutover-fixtures.mjs` и его ожидания.
4. В `r2-11-owner-cutover/README.md` перевести `C6A` и `C6B` в `superseded`,
   добавить абзац «почему» со ссылкой на
   [`01-current-state.md`](01-current-state.md), обновить `Resume Here`.
5. В `docs/project/roadmap.md` добавить указание на этот пакет как на текущий
   control plane; статусы `R0`–`R6` не трогать, чтобы не сломать
   `validate-plan-recovery`.
6. Зарегистрировать пакет в `docs/tutorials/README.md` и `docs/index.md`.

## Edge and failure cases

- `validate-plan-recovery.mjs` проверяет только `raster-editor-migration`;
  изменение статусов там ломает гейт. Менять статусы `R*` нельзя.
- Ссылки в markdown проверяются `validate:docs`; каждая новая ссылка должна
  указывать на существующий файл.

## Persistence and rollback

Изменений схемы и поведения нет. Откат — revert одного коммита.

## i18n and assets

Не затрагиваются.

## Checks

- `npm run validate:docs`, `validate:raster-entry`, `validate:cutover`,
  `validate:cutover-fixtures`, `validate:lines`.
- `npm test` остаётся зелёным.

## Acceptance criteria

- [ ] `project.config.json` не указывает на `src/raster-main.ts`.
- [ ] `C6A` и `C6B` помечены `superseded` с записанной причиной.
- [ ] Пакет зарегистрирован и все ссылки резолвятся.
- [ ] Гейты зелёные.

## Completion record

- Commit: `AE-Q1`
- Checks: `validate:raster-entry` (`cutover target is
  src/app/mountProductionShell.ts`), `validate:cutover`
  (`431 modules, 253 source JS, 169 legacy-state JS`),
  `validate:cutover-fixtures` (`5 fixtures`), `validate:docs`,
  `validate:lines`, `npm run check`, `npx eslint .`, `npm test` — все зелёные.
- Note: `tools/validate-raster-entry.mjs` больше не требует существования
  `src/raster-main.ts` и отклоняет его и `src/main.ts` как цель. Файл цели
  создаётся в `Q6`, поэтому проверяется объявление, а не наличие.
- Date: 2026-09-06
