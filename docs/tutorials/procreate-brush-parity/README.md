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

- Current stage: owner validation (`PBP-1` / Huion smoke)
- Status: `awaiting_owner_validation`
- Last completed stage: `PBP-8`
- Next action: проверить физическим пером, что `lineart` остаётся после
  `pointerup`, затем сравнить диапазон pressure и вид штриха с Procreate
- Blockers: автоматический рантайм не может воспроизвести Windows Ink конкретного
  Huion; тип ввода и raw pressure теперь видны в Brush Studio
- Working paths: `src/app-folders/sources/` (данные, кодом не читаются),
  `src/core/brush/procreateBrush.ts`, `src/logic/brush/brushCoverage.ts`,
  `src/core/brush/visitSubpixelDab.ts`, `src/logic/brush/grainTile.ts`,
  `src/logic/stroke/`, `tests/brush/`, `tests/stroke/`
- Last checks: TS 114 files / 304 tests; performance 18 / 55; legacy 118 unit
  и 396 integration; check, lint, lines, cycles, docs, shell catalog, build и
  browser restart smoke — зелёные
- Last updated: `2026-08-18, subpixel Lineart repair; Resume Here — Huion validation`

## Краткий вывод исследования

`lineart.brush` ссылается на library Shape/Grain. Production decoder теперь
читает снятые sources, а compact preview показывает сам Shape без процедурного
круга. Live feedback выявил ещё три разрыва после раннего закрытия этапов:
`paintSize`/`paintOpacity` не были проведены в runtime, pressure повторно
clamp-ился доменом кисти, а dirty tile заставлял каждый pointer event обходить
всю историю штриха. Все три причины исправлены; alias sources получают
собственную копию buffer и не обнуляются после worker transfer. Последующий
owner smoke выявил ещё один разрыв: настоящий Shape около `1 px` мог не попасть
ни в один центр пикселя. Для него добавлена area-интеграция без процедурной
подмены формы.

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
| `PBP-6` | [`60-stage-preview-cache.md`](60-stage-preview-cache.md) | completed |
| `PBP-7` | [`70-stage-last-tools.md`](70-stage-last-tools.md) | completed |
| `PBP-8` | [`80-stage-library-workflow.md`](80-stage-library-workflow.md) | completed |

`PBP-1` не блокировал реализацию, но остаётся финальным owner gate: только
физический Huion и эталон Procreate могут подтвердить итоговый вид и Windows Ink.

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
