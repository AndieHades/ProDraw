# Политика проверок

Выбирай минимальный gate, который доказывает изменённую поверхность.

| Изменение | Обязательная проверка |
| --- | --- |
| docs/rules/hooks | `npm run validate:docs`, `npm run validate:lines`, diff read |
| чистая logic | focused Vitest + `npm run check` + targeted lint |
| core contract/state | unit + integration + check + targeted lint |
| drawing/input/brush | focused integration + browser smoke + check/lint |
| persistence/import/export | round-trip/failure tests + check/lint |
| wide refactor/dependencies | `npm run validate` и `npm run build` |

Дополнительно:

- `npm run validate:cycles` — при изменении imports/layers;
- `npm run validate:architecture` — rejection fixtures для forbidden imports и line limit;
- `git diff --check` — перед каждым коммитом;
- screenshot не является gate без явной просьбы пользователя;
- skipped/conditional проверки перечисляются точным именем и причиной.

Полный `validate` должен объединять typecheck, lint, tests, docs, line limit,
import cycles и production build. `validate:changed` может выбирать более узкий
набор, но не заменяет доказательство поведения.
