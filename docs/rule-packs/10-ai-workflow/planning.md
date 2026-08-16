# Правила планирования

## Когда обязательно

Прочитать файл целиком до исследования, если пользователь просит план,
миграцию, несколько этапов, изменение архитектуры или устойчивость к handoff.
Если запрошены план и реализация, сначала сохранить план, затем начать этап.

## Форма

Короткий план в `docs/project/*-plan.md` допустим только для одного владельца,
одного коммита, без cutover/миграции и объёмом до 250 строк. Иначе создать
`docs/tutorials/<slug>/`:

```text
README.md
01-current-state.md
02-target-contract.md
03-decisions-and-risks.md
10-stage-*.md
20-stage-*.md
90-verification.md
```

Зарегистрировать пакет в `docs/tutorials/README.md` и `docs/index.md`.

## Сначала доказательства

Зафиксировать branch/HEAD/status и проверить entrypoint, данные, runtime wiring,
тесты, persistence, UI, i18n и assets. Отдельно описать:

- подтверждённое текущее поведение;
- требуемый результат;
- разрыв;
- безопасные предположения.

Наличие каталога или импорта не равно созданию, потреблению и наблюдаемому
поведению. Каждое важное утверждение получает путь, тест или команду.

## README как control plane

README содержит статус (`draft`, `ready`, `in_progress`, `blocked`, `done`,
`superseded`), evidence baseline, scope, requirement ids, этапы/зависимости,
completion definition и блок:

```md
## Resume Here
- Current stage:
- Status:
- Last completed stage:
- Next action:
- Blockers:
- Working paths:
- Last checks:
- Last updated:
```

Только один этап может быть `in_progress`.

## Контракт этапа

Каждая глава этапа задаёт stable id, зависимости, scope, change map, контракты,
нумерованные шаги, edge/failure cases, persistence/rollback, i18n/assets,
точные проверки, acceptance criteria и completion record.

Один этап — один проверяемый вертикальный результат и один сфокусированный
коммит. Cutover и cleanup разделяются, если нужен rollback. Изменение решения
сначала отражается в плане.

## Завершение

План `done`, только когда все requirements имеют acceptance evidence, этапы
содержат коммиты и проверки, obsolete paths убраны/явно отложены, документы
согласованы, а `Resume Here` указывает на финальное доказательство.
