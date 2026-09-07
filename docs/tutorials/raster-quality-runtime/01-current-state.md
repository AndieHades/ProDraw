# Current state

Baseline: `asset-editor@6cc56bb`, 2026-09-06. Каждое утверждение ниже получено
командой или чтением файла, а не выводом из документации.

## Два приложения, в продакшн идёт одно

`index.html:500` грузит `/src/legacy-entry.js` → [`src/app.js`](../../../src/app.js).
`src/raster-main.ts` и
`src/main.ts` не импортируются ниоткуда, кроме
`tools/validate-cutover-fixtures.mjs` и `tools/validate-raster-entry.mjs`.

Обход графа импортов от каждой точки входа:

| Граф | модулей | `.ts` | `.js` | строк |
| --- | ---: | ---: | ---: | ---: |
| весь `src` | 622 | 369 | 253 | 35 927 |
| достижимо из `index.html` | 429 | 197 | 232 | 25 414 |
| граф `raster-main.ts` / `main.ts` | 172 | 172 | 0 | 10 247 |
| пересечение | 17 | | | |

Проверка по сборке: после `npx vite build` строки `RasterEditorApp`,
`DocumentCompositor` и `StrokePipeline` отсутствуют в `dist/assets/*.js`.

## `RasterEditorApp` не является портом продукта

`src/app/RasterEditorApp.ts`:

- конструктор бросает `"Brush library is empty"` без библиотеки кистей, что
  противоречит `ASSET-01` из [asset-editor cutover](../asset-editor-cutover/README.md);
- `handleCommand` обрабатывает `document.new/open/save/saveAs/exportPng/create`,
  `history.undo/redo`, `tool.select`, `view.fit/rotate`, `brush.library.open`,
  `layer.add/select/visibility` — и больше ничего;
- отсутствуют PSD-импорт и экспорт, галерея, папки слоёв, выделение,
  трансформация, Crop, Trim, текст, анимация, эффекты, палитра, Tile Mode и
  отражение документа.

Живой TS (197 модулей) и TS `RasterEditorApp` (172 модуля) пересекаются на 17
модулях. Это два почти непересекающихся тела кода, а не одно на разных стадиях.

Следствие: `C6A` из [`r2-11-owner-cutover`](../raster-editor-migration/r2-11-owner-cutover/README.md)
в буквальной формулировке привёл бы к потере почти всех функций продукта.

## Модель пикселей нарушает собственное правило репозитория

`docs/rule-packs/00-core/repository-rules.md` запрещает «возвращать `grid[y][x]`
как модель полноцветного документа». Живой слой — именно она:
[`src/logic/sparse-grid.js`](../../../src/logic/sparse-grid.js) хранит строку
как `Proxy` над `Array`, а пиксель — как отдельный JS-массив `[r,g,b,a]`.

Замер на baseline-машине, 1024×1024 = 1 048 576 пикселей, тот же
`createSparseGrid`:

| Операция | sparse proxy | plain arrays | `Uint8ClampedArray` |
| --- | ---: | ---: | ---: |
| запись 1M px | 265.3 ms | 8.5 ms | 2.8 ms |
| чтение 1M px | 4.3 ms | 4.1 ms | 1.5 ms |

Запись медленнее типизированного буфера в **93 раза**. Причина: `set`-ловушка
делает `Reflect.defineProperty` на каждый пиксель, а `Object.setPrototypeOf` в
`createRow` навсегда выводит строку из fast-elements режима.

Куча под 1M ячеек `[r,g,b,a]` — около 87 MB против 4 MB у `Uint8ClampedArray`.

## Каждый пиксель штриха пишется четыре раза

[`src/systems/draw/cells.js`](../../../src/systems/draw/cells.js) `createCellPainter`
и [`src/core/raster/LegacyRasterSurfaceBacking.ts`](../../../src/core/raster/LegacyRasterSurfaceBacking.ts)
`writeCells` вместе дают на один окрашенный пиксель:

1. `grid[y][x] = value` — запись в sparse `Proxy`;
2. `writes.push(cellWrite(...))` — объект из семи полей;
3. `edit.setTilePixels(...)` — запись в тайловую `RasterSurface`;
4. `base` Map и `cell.slice()` — копия для отмены.

`LegacyRasterSurfaceBacking.write` и `writeCells` содержат `row[x] = value`
рядом с записью в тайл. То есть `C2B` не снял старую модель, а добавил вторую
поверх неё. Обе поддерживаются одновременно.

Наблюдаемое следствие: `tests/performance/legacyRasterBrushBudgets.test.js`
(«один интерполированный ход пера, кисть 64 px») в полном прогоне даёт
`106.6 ms` при бюджете `PERFORMANCE_BUDGETS.largeSoftDabP50Milliseconds = 75`.
Изолированно тест проходит за `236 ms` на четыре кейса. Запаса нет.

## Глубина Undo схлопнута моделью памяти

[`src/config/limits.ts:18`](../../../src/config/limits.ts): `historyCap` даёт
`8` записей при площади больше `90 000` px. Для `1920×1080` пользователь
получает восемь отмен. `snapshot()` в
[`src/core/history.js`](../../../src/core/history.js) клонирует все сетки
целиком через `cloneLayer` → `cloneGrid`, а `trimUndo` считает записи, не байты.

## Кисти: движок есть, продакшн его не грузит

[`src/systems/draw/brush.js`](../../../src/systems/draw/brush.js) — первая
строка файла: «Лёгкий твёрдый отпечаток Pencil/Eraser без preset, pressure или
preview». `brushStampWith` обходит bounding box и красит ячейки одной
непрозрачностью `S.brushOpacity[tool]`.

Поиск по живому JavaScript: `.pressure`, `tiltX` и `tiltY` не читаются нигде.
`getCoalescedEvents` встречается только в
`src/core/input/actualPointerEvents.ts`
и [`src/systems/drawing/DrawingSystem.ts:126`](../../../src/systems/drawing/DrawingSystem.ts)
— оба модуля достижимы лишь из `RasterEditorApp`.

Настоящий движок (`procreateBrush.ts`, `renderBrushDab.ts`, `visitSubpixelDab.ts`,
`brushCoverage.ts`, grain domain, кривые динамик, `StrokePipeline`) существует,
покрыт тестами и имеет собственный план
[`procreate-brush-parity`](../procreate-brush-parity/README.md) в статусе
`awaiting_owner_validation`. Он не подключён к продакшн-оболочке.

Это и есть причина «кисти не получаются»: продакшн рисует твёрдым бинарным
отпечатком без давления, а движок кистей лежит в графе, который не грузится.

## Гейты красные

| Команда | Результат |
| --- | --- |
| `tsc --noEmit` | зелёный |
| `npx eslint .` | 14 ошибок `no-undef` в `tests/performance/legacyRasterBrushBudgets.test.js` |
| `npm test` | код выхода `1`, 3 упавших файла из 54 |
| `npm run validate:cycles` | зелёный, 369 файлов |
| `npm run validate:lines` | зелёный |
| `npm run validate:cutover` | 431 модуль, 253 source JS, 169 legacy-state JS |

Причина ошибок lint: `eslint.config.js` покрывает `src/**/*.js`,
`test/**/*.mjs`, `tools/**/*.mjs`, но ни один блок не задаёт globals для
`tests/**/*.js`.

`npm test` не запускает `tests/brush/**` (40 файлов): `test:ts` исключает этот
каталог, а `test:performance` берёт только `tests/performance`. Внутри
исключённого каталога `brushGoldenPlans.test.ts` падает на несовпадении
golden-хешей `lineart.brush` и `sketching.brush`.

## Прочие измеренные горячие точки

- `paintStack` в [`src/core/composite.js`](../../../src/core/composite.js) на
  каждый слой каждого кадра делает `isolated.find(...)` и дважды
  `groups.filter(...).sort(...)`.
- `isolatedSurface()` аллоцирует `makeCanvas(S.W, S.H)` на каждую изолированную
  папку каждого кадра без пула.
- `layerFloatCanvas` в [`src/core/layer-cache.js`](../../../src/core/layer-cache.js)
  рисует плавающее выделение через `fillRect(x, y, 1, 1)` на каждый пиксель.
- `window.addEventListener('resize', fitView)` в
  [`src/systems/render/index.js`](../../../src/systems/render/index.js) делает
  синхронный `render()` и сбрасывает зум и пан пользователя при любом ресайзе.
- 41 прямой вызов `render()` в обход rAF-коалесцера `requestRender()`.
- `layList()` в [`src/systems/layers/list.js`](../../../src/systems/layers/list.js)
  делает `box.innerHTML = ''` и пересобирает панель: новый canvas 40×40 и
  `layerCanvas(index)` на строку, около восьми слушателей на строку. Привязано
  к `bus.on('layers')`, который эмитится из 45 мест.
- `move()` в [`src/systems/input/index.js`](../../../src/systems/input/index.js)
  вызывает `getBoundingClientRect()` на каждом pointermove во время рисования и
  пишет `cv().style.cursor` на каждом событии.
- 23 вызова `getImageData`, включая пары «читать источник, читать назначение,
  смешать в JS» в `effect-surface.js`, `effect-canvas.js`, `effects-render.js`.

## Сборка

`npx vite build`: главный чанк `535.35 kB` (`178.21 kB` gzip) — выше порога
Vite; `index.html` `42.31 kB`, 847 элементов, 353 `id`, 92 инлайновых SVG, 21
диалог, всё создаётся при загрузке; CSS `74.51 kB`. PSD-декодер `288.60 kB`
вынесен в отдельный чанк корректно. `.brush` ассеты в бандл не попадают.

## Что в проекте здорово

`tsconfig` строгий, включая `noUncheckedIndexedAccess` и
`exactOptionalPropertyTypes`. В `src` ноль `@ts-ignore`, `eslint-disable` и
`any`. Архитектурные eslint-правила рабочие, циклов импортов нет, лимит 150
строк соблюдён. Electron настроен верно: `contextIsolation: true`,
`sandbox: true`, `nodeIntegration: false`, preload и CSP.
