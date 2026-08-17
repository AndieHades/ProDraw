# Procreate Brush Parity (lineart.brush)

Status: `draft`

Evidence baseline: `main@64ec94e`, 2026-08-17. Рабочее дерево содержит
незакоммиченный tilemap-removal; кисточная поверхность им не затронута.

Пакет владеет одним вопросом: почему `.brush` из Procreate рисует в ProDraw
иначе, чем в Procreate, и что нужно изменить, чтобы штрих совпадал. Эталон
разбора — `src/app-folders/brushes/main/lineart.brush`; выводы применимы ко всем
бандлам, так как все они идут через один decoder и один dab-движок.

## Resume Here

- Current stage: `PBP-1`
- Status: `draft`
- Last completed stage: none
- Next action: закрыть `PBP-1` — без метрики любое подключение источников
  проверяется на глаз и откатывается при первом же расхождении
- Blockers: нет. `D-1` решён; форма и зерно для `lineart` сняты и лежат в
  `src/app-folders/sources/lineart/` **в неподключенном состоянии**
- Working paths: `src/app-folders/sources/` (данные, кодом не читаются),
  `src/core/brush/procreateBrush.ts`, `src/logic/brush/brushCoverage.ts`,
  `src/logic/brush/grainTile.ts`, `tests/`
- Last checks: `npm run check`, `validate:cycles`, `validate:docs` — зелёные на
  откатанном дереве. `validate:lines` падает на пре-существующих stale
  exemptions cutover-а
- Last updated: `2026-08-17, пробное подключение источников откатано, см. 05-attempt-log.md`

## Краткий вывод исследования

`lineart.brush` не содержит собственных `Shape.png`/`Grain.png` — он ссылается на
встроенную библиотеку Procreate (`Brush-Pocket-Brick.png`,
`Brush-Artery-Charcoal-Corse.jpg`). ProDraw этих ассетов не имеет и подставляет
процедурные заглушки, поэтому отпечаток кончика неправильный ещё до любой
динамики. Поверх этого лежат четыре независимых разрыва: вырождение grain-тайла
до 2×2 пикселей, полностью игнорируемые кривые отклика Procreate, эвристики
плана даба/taper и некалиброванные домены размера/непрозрачности.

Подробности с путями и числами — [`01-current-state.md`](01-current-state.md).

## Scope

- `PBP-01`: воспроизводимая метрика расхождения между штрихом ProDraw и
  эталонным штрихом Procreate, а не визуальная оценка на глаз.
- `PBP-02`: shape и grain кисти берутся из настоящего ассета, а не из
  процедурной заглушки; отсутствие ассета — явное, наблюдаемое состояние.
- `PBP-03`: grain-домен (scale/zoom/rotation/movement) даёт тайл с сохранённой
  детализацией и предсказуемым физическим размером.
- `PBP-04`: кривые `dynamicsPressure*Curve`, скоростные и jitter-динамики
  участвуют в отклике; неподдержанное остаётся honest-unsupported.
- `PBP-05`: план даба (count/scatter/orientation) и taper соответствуют
  документированной семантике Procreate, включая настоящий хвостовой taper.
- `PBP-06`: домены размера и непрозрачности калиброваны, а штрих
  композитится один раз, без самозатемнения при пересечении.

## Delivery

| Stage | Chapter | Status |
| --- | --- | --- |
| `PBP-1` | [`10-stage-parity-harness.md`](10-stage-parity-harness.md) | draft |
| `PBP-2` | [`20-stage-shape-grain-sources.md`](20-stage-shape-grain-sources.md) | draft |
| `PBP-3` | [`30-stage-grain-domain.md`](30-stage-grain-domain.md) | draft |
| `PBP-4` | [`40-stage-stroke-response.md`](40-stage-stroke-response.md) | draft |
| `PBP-5` | [`50-stage-size-opacity-compositing.md`](50-stage-size-opacity-compositing.md) | draft |

Зависимости строго линейные: `PBP-1` даёт измерение, `PBP-2` снимает
доминирующую ошибку, дальше по убыванию вклада. Каждый этап — один
сфокусированный коммит.

## Целевой контракт и решения

- [`02-target-contract.md`](02-target-contract.md) — что считается «1 в 1».
- [`03-decisions-and-risks.md`](03-decisions-and-risks.md) — решения и риски.
- [`04-source-capture.md`](04-source-capture.md) — как снять форму и зерно из
  Procreate, не имея доступа к файлам приложения.
- [`05-attempt-log.md`](05-attempt-log.md) — что дало и чего стоило пробное
  подключение источников до `PBP-1`.
- [`90-verification.md`](90-verification.md) — гейты и протокол эталонов.

## Completion Definition

- Каждый `PBP-0x` имеет acceptance evidence на эталонных снимках Procreate.
- `lineart.brush` укладывается в порог из
  [`02-target-contract.md`](02-target-contract.md) на всех эталонных штрихах.
- Оставшиеся расхождения перечислены поимённо в
  `BrushCompatibilityReport.unsupportedActiveFields` и видны в Brush Studio.
- Процедурные заглушки формы/зерна либо удалены, либо помечены как явный
  fallback с предупреждением, а не как «настоящая кисть».
- Этапы содержат коммиты и проверки, `Resume Here` указывает на финальное
  доказательство.
