# Политика проверок

Выбирай минимальный gate, который доказывает изменённую поверхность.

| Изменение | Обязательная проверка |
| --- | --- |
| docs/rules/hooks | `validate:docs`, `validate:lines`, `validate:hooks`, diff read |
| чистая logic | focused Vitest + `npm run check` + targeted lint |
| core contract/state | unit + integration + check + targeted lint |
| drawing/input/brush | focused integration + browser smoke + check/lint |
| persistence/import/export | round-trip/failure tests + check/lint |
| wide refactor/dependencies | `validate:cutover`, `npm run validate` и `npm run build` |

Дополнительно:

- `npm run validate:cycles` — при изменении imports/layers;
- `npm run validate:architecture` — rejection fixtures для forbidden imports и line limit;
- `npm run validate:hooks` — при изменении agent entrypoints/config;
- `git diff --check` — перед каждым коммитом;
- screenshot не является gate без явной просьбы пользователя;
- skipped/conditional проверки перечисляются точным именем и причиной.

Полный `validate` должен объединять typecheck, lint, tests, docs, line limit,
import cycles и production build. `validate:changed` может выбирать более узкий
набор, но не заменяет доказательство поведения.

После R2 production entrypoint больше не создаёт legacy pixel DOM, поэтому
`test/module-int.mjs` и `test/module-boot.mjs` относятся к удалённому
pre-cutover brush shell и не входят в зелёный gate. `npm run test:legacy`
выполняет чистые legacy unit tests и storage tests; новый runtime доказывают
Vitest, `validate:raster-entry`
и browser/packaged smoke.
