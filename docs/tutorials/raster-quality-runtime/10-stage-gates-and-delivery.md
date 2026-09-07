# Stage `Q0`: правдивые гейты и macOS-сдача

- Status: `ready`
- Depends on: none
- Requirements: `RQ-GATE-01`, `RQ-DELIVERY-01`

## Scope

Довести `npm test`, `npm run lint` и `npm run validate` до зелёного состояния
без молча исключённых наборов тестов и перевести контракт сдачи на macOS.
Продуктовое поведение не меняется.

## Change map

| Путь | Изменение |
| --- | --- |
| `eslint.config.js` | блок globals для `tests/**/*.{js,mjs}` |
| `package.json` | `test:ts` перестаёт исключать `tests/brush`; `smoke:desktop` указывает на macOS |
| `tests/brush/brushGoldenPlans.test.ts` | расхождение golden-хешей зафиксировано явно |
| `tests/performance/*` | прогон в один worker без гонки с функциональными тестами |
| `project.config.json` | `targetPlatform: "macos-desktop"` |
| `AGENTS.md` | раздел «Desktop-сдача» переписан под `/Applications/ProDraw.app` |
| `tools/validate-desktop-shell.mjs` | проверка macOS-бандла |
| `README.md`, `docs/project/validation-policy.md` | согласование команд сдачи |

## Contracts

- `npm test` завершается кодом `0` и запускает каждый файл из `tests/`.
- Ни один каталог тестов не исключается без записанной причины в
  `docs/project/validation-policy.md`.
- `npm run package:mac` без `CI` обновляет `/Applications/ProDraw.app` и
  прогоняет packaged smoke для собранного бандла.

## Steps

1. Добавить в `eslint.config.js` блок для `tests/**/*.{js,mjs}` с
   `globals.node` и `globals.browser`; убедиться, что 14 ошибок `no-undef` в
   `tests/performance/legacyRasterBrushBudgets.test.js` исчезли.
2. Убрать `--exclude tests/brush/**` из `test:ts`.
3. Разобрать падение `brushGoldenPlans.test.ts`: определить, изменился ли
   decoder или устарели записанные хеши. Если устарели — перезаписать golden и
   сослаться на коммит, который изменил поведение. Если изменился decoder —
   зафиксировать регрессию отдельной записью в `docs/project/idea-inbox.md`
   и пометить тест `it.fails` с точной причиной и ссылкой.
4. Убрать гонку измерений: `tests/performance` уже идёт отдельным скриптом в
   один worker; проверить, что `npm test` не запускает его параллельно с
   функциональными файлами, и что `legacyRasterBrushBudgets` меряет только
   собственный кейс.
5. Зафиксировать текущий фактический результат бюджета кисти в
   `docs/project/performance-budgets.md` как baseline `Q0` с датой и хостом.
   Не поднимать предел, чтобы скрыть отказ.
6. `project.config.json`: `targetPlatform` → `"macos-desktop"`.
7. Переписать раздел «Desktop-сдача» в `AGENTS.md`: постоянная цель —
   `/Applications/ProDraw.app`, команда — `npm run package:mac` без `CI`,
   `CI=1` и `artifacts/desktop` остаются staging.
8. Обновить `tools/validate-desktop-shell.mjs` так, чтобы он проверял
   macOS-путь и не требовал Windows-артефактов.
9. Синхронизировать `README.md` и `docs/project/validation-policy.md`.

## Edge and failure cases

- Golden-хеши расходятся из-за платформы, а не кода: проверить на том же
  бандле `.brush`, зафиксировать хост в тесте, не переписывать вслепую.
- `codesign` недоступен: `package:mac` должен падать понятной ошибкой, а не
  тихо ставить неподписанный бандл.
- `/Applications/ProDraw.app` занят запущенным процессом: подготовить staging и
  довести обновление после освобождения цели, не завершая процесс пользователя.

## Persistence and rollback

Изменений схемы нет. Откат — revert одного коммита.

## i18n and assets

Новых пользовательских строк нет. `.brush` ассеты не меняются.

## Checks

- `npx eslint .` — ноль ошибок.
- `npm test` — код выхода `0`; вывести число файлов и тестов.
- `npm run validate:docs`, `validate:lines`, `validate:desktop`.
- `npm run package:mac` без `CI`; открыть `/Applications/ProDraw.app`.

## Acceptance criteria

- [ ] `npm test` зелёный и включает `tests/brush`.
- [ ] `npx eslint .` зелёный.
- [ ] Причина любого пропущенного теста записана точным именем и ссылкой.
- [ ] `AGENTS.md`, `project.config.json`, `README.md` и validation-policy
      согласованно описывают macOS-сдачу.
- [ ] Пользователь открыл обновлённый `/Applications/ProDraw.app`.

## Completion record

- Commit:
- Checks:
- Date:
