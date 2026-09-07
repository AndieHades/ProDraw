# Raster Quality Runtime

Status: `ready`

Evidence baseline: `asset-editor@6cc56bb`, 2026-09-06. Рабочее дерево чистое,
`origin/main` впереди на 6 коммитов; перенос поверх `main` выполняется до
первого коммита этапа.

## Authority

Пользователь запросил аудит и план всех исправлений. Подтверждённые решения:

1. Целевая платформа сдачи и приёмки — **macOS**; проверка идёт через
   `/Applications/ProDraw.app`. Windows остаётся возможной сборкой, но не
   блокирует приёмку этапа.
2. Brush subsystem **не удаляется**. Пользователь хочет качественные растровые
   кисти и рисование планшетом; сейчас это не работает. Кисти — цель, а не
   мусор.
3. Продукт — растровый редактор игровых ассетов. Пиксель-арт не является
   моделью документа.

## Outcome

Один строгий TypeScript-runtime, построенный на **сохранённой продакшн-оболочке**
(в ней уже есть PSD/PNG, галерея, слои и папки, выделение, трансформация, Crop,
Trim, текст, анимация, эффекты, Tile Mode), с **реальным движком кистей** и
одним тайловым RGBA-владельцем пикселей, достаточно быстрым для пера.

Явно **не** цель: переключить продакшн на `RasterEditorApp`. Он знает ~15 команд
и не содержит PSD, галереи, папок, выделения, трансформации, Crop, Trim, текста,
анимации и эффектов. Доказательства — [`01-current-state.md`](01-current-state.md).

## Requirements

- `RQ-GATE-01`: `npm test`, `npm run lint` и `npm run validate` зелёные, ни один
  набор тестов не исключён молча.
- `RQ-DELIVERY-01`: каждый принятый этап доходит до `/Applications/ProDraw.app`
  и проходит packaged smoke на macOS.
- `RQ-OWN-01`: продакшн не содержит `grid[y][x]` как модель полноцветного
  документа; тайловая RGBA-поверхность — единственный владелец пикселей.
- `RQ-OWN-02`: одна точка входа и один composition root; параллельного
  спящего редактора нет.
- `RQ-HIST-01`: глубина Undo не схлопывается до 8 шагов на реальных размерах
  холста; вытеснение считается в байтах, а не в штуках.
- `RQ-IN-01`: coalesced pointer samples не теряются, pressure и tilt доходят до
  stroke pipeline на пере и планшете.
- `RQ-BRUSH-01`: продакшн рисует настоящими `.brush` пресетами с их shape и
  grain, а не твёрдым бинарным отпечатком.
- `RQ-PERF-01`: бюджеты рисования, композита и UI держатся с запасом, измеренным
  на эталонной фикстуре, а не впритык к пределу.
- `RQ-TS-01`: каждый продакшн-модуль — строгий TypeScript.
- `RQ-PAR-01`: сохранённые asset-процессы (PSD/PNG импорт и экспорт, галерея,
  слои и папки, выделение, трансформация, Crop, Trim, текст, анимация,
  Tile Mode, отражение) сохраняют наблюдаемое поведение.

## Delivery order

| Stage | Outcome | Depends on | Status |
| --- | --- | --- | --- |
| `Q0` | правдивые гейты и macOS-сдача | none | done |
| `Q1` | исправленная цель cutover, C6A/C6B superseded | `Q0` | done |
| `Q2A` | тайлы — единственный источник чтения | `Q1` | in_progress |
| `Q2B` | тайлы — единственная цель записи, `grid[y][x]` снят | `Q2A` | draft |
| `Q3` | coalesced ввод с pressure и tilt | `Q2B` | draft |
| `Q4` | настоящий движок кистей в продакшн-оболочке | `Q3` | draft |
| `Q5` | горячие пути композита, панели слоёв и эффектов | `Q2B` | draft |
| `Q6` | оставшийся продакшн-JavaScript переведён в TypeScript | `Q5` | draft |
| `Q7` | параллельный редактор удалён, финальные гейты | `Q6` | draft |

Только один этап может быть `in_progress`. Каждая глава владеет своим списком
файлов, проверками, acceptance criteria и completion record.

## Chapters

1. [Current state](01-current-state.md)
2. [Target contract](02-target-contract.md)
3. [Decisions and risks](03-decisions-and-risks.md)
4. [`Q0` Gates and delivery](10-stage-gates-and-delivery.md)
5. [`Q1` Cutover target](15-stage-cutover-target.md)
6. [`Q2A` Tile read owner](20-stage-tile-read-owner.md)
7. [`Q2B` Tile write owner](25-stage-tile-write-owner.md)
8. [`Q3` Pointer truth](30-stage-pointer-truth.md)
9. [`Q4` Brush engine](40-stage-brush-engine.md)
10. [`Q5` Composite and UI](50-stage-composite-and-ui.md)
11. [`Q6` TypeScript completion](60-stage-typescript-completion.md)
12. [`Q7` Retire the parallel editor](70-stage-retire-parallel-editor.md)
13. [Verification](90-verification.md)

## Completion definition

- [ ] `npm run validate` зелёный без исключённых наборов тестов.
- [ ] `git ls-files src` не содержит продакшн `.js` модулей.
- [ ] Продакшн-импорты не содержат grid/pixelizer-совместимого владельца.
- [ ] Перо с pressure и tilt рисует настоящей `.brush` кистью в продакшне.
- [ ] Каждая строка `RQ-PAR-01` имеет положительное, отказное и persistence
      доказательство.
- [ ] Бюджеты `RQ-PERF-01` держатся с запасом на эталонной фикстуре.
- [ ] `/Applications/ProDraw.app` собран из принятого коммита и прошёл smoke.
- [ ] Roadmap, `r2-11-owner-cutover` и этот `Resume Here` согласованы.

## Resume Here

- Current stage: `Q2A — тайлы как единственный источник чтения`
- Status: `in_progress`
- Last completed stage: `Q1 — исправленная цель cutover`
- Next action: подэтап `Q2A-3` — перевести команды слоёв
  (`layers/{bulk-pixels,fill,reference-pixels}`, `layer-center`, `mono`,
  `recolor`, `free-rotate`, `layer-bake-grid`) на регионное чтение
- Blockers: none
- Working paths: `src/core/layer-cache.js`, `src/logic/raster`,
  `src/systems/render`, `src/systems/selection`, `tools/validate-cutover.mjs`
- Last checks: `npm run validate` зелёный целиком на `Q2A-2`: `166`/`462`
  TypeScript и `16`/`57` performance тестов; `Q2A-1`, `Q2A-1b`, `Q2A-2` закрыты
- Last updated: 2026-09-06
