# Procreate Brush Parity (lineart.brush)

Status: `in_progress`

Evidence baseline: `main@8e7faee`, 2026-08-18. Единственный посторонний файл в
рабочем дереве — untracked `.claude/launch.json`; он не относится к кистям и
не изменяется.

Пакет владеет одним вопросом: почему `.brush` из Procreate рисует в ProDraw
иначе, чем в Procreate, и что нужно изменить, чтобы штрих совпадал. Эталон
разбора — `src/app-folders/brushes/main/lineart.brush`; выводы применимы ко всем
бандлам, так как все они идут через один decoder и один dab-движок.

## Resume Here

- Current stage: `PBP-6`
- Status: `in_progress`
- Last completed stage: `PBP-5`
- Next action: завершить versioned preview cache, persistence последней
  кисти/цвета и закрепляемую библиотеку с назначаемыми клавишами
- Blockers: нет. Владелец подтвердил правильность source PNG и берёт на себя
  финальное визуальное сравнение с Procreate (`D-7`)
- Working paths: `src/app-folders/sources/` (данные, кодом не читаются),
  `src/core/brush/procreateBrush.ts`, `src/logic/brush/brushCoverage.ts`,
  `src/logic/brush/grainTile.ts`, `src/logic/stroke/`, `tests/brush/`
- Last checks: 30 brush files / 66 tests; 18 performance files / 55 tests;
  check, targeted lint, lines, cycles и Vite reload smoke — зелёные
- Last updated: `2026-08-18, PBP-4/5 закрыты; Resume Here — PBP-6`

## Краткий вывод исследования

`lineart.brush` не содержит собственных `Shape.png`/`Grain.png` и ссылается на
библиотеку Procreate. Правильные снятые sources уже лежат в
`src/app-folders/sources/{shape,grain}/lineart.png`, но production decoder их не
читает и продолжает подставлять процедурные заглушки. Поверх этого лежат
независимые разрывы: grain-тайл вырождается до 2×2, `shapeScatter` ошибочно
сдвигает stamps вместо их вращения, кривые отклика игнорируются, конечный taper
подменён реакцией на pressure, а один stroke повторно композитится на каждом
pointer event.

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
- `PBP-07`: повторное открытие библиотеки не декодирует и не рендерит заново
  неизменённые previews; видимые карточки появляются из versioned cache.
- `PBP-08`: последняя выбранная кисть и последний активный цвет переживают
  перезапуск web-development и Windows desktop runtime.
- `PBP-09`: библиотека остаётся открытой до явного крестика, а назначенные
  кистям клавиши переключают их без открытия панели.
- `PBP-10`: `lineart` является first-run и invalid-selection default; живой
  сохранённый выбор имеет приоритет.

## Delivery

| Stage | Chapter | Status |
| --- | --- | --- |
| `PBP-1` | [`10-stage-parity-harness.md`](10-stage-parity-harness.md) | deferred |
| `PBP-2` | [`20-stage-shape-grain-sources.md`](20-stage-shape-grain-sources.md) | completed |
| `PBP-3` | [`30-stage-grain-domain.md`](30-stage-grain-domain.md) | completed |
| `PBP-4` | [`40-stage-stroke-response.md`](40-stage-stroke-response.md) | completed |
| `PBP-5` | [`50-stage-size-opacity-compositing.md`](50-stage-size-opacity-compositing.md) | completed |
| `PBP-6` | [`60-stage-preview-cache.md`](60-stage-preview-cache.md) | planned |
| `PBP-7` | [`70-stage-last-tools.md`](70-stage-last-tools.md) | planned |
| `PBP-8` | [`80-stage-library-workflow.md`](80-stage-library-workflow.md) | planned |

`PBP-1` больше не блокирует реализацию: владелец сам выполняет визуальное
сравнение, а автоматические проверки доказывают source identity, численную
семантику и отсутствие регрессий. `PBP-2..PBP-5` остаются линейными и каждый
закрывается отдельным сфокусированным коммитом.

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
