# Каталог переиспользуемого

**Проверь этот список перед написанием любого помощника.** Если нужное здесь
есть — импортируй, не переписывай. Добавил общий помощник — впиши его сюда.

## `core/state.js` — данные и фабрики

| Имя | Назначение |
|-----|-----------|
| `S` | единый объект состояния (мутируй поля: `S.cur`, `S.layers`…) |
| `G()` | сетка текущего слоя (`S.layers[S.cur].grid`) |
| `blank(w,h)` | пустая `h×w` сетка из `null` |
| `newLayer(name,w,h)` | новый слой со стандартными полями |
| `cloneLayer(L,overrides?)` | глубокая копия слоя (история/галерея/дубликат); `overrides` перекрывают поля. **Не собирай литерал слоя вручную** |
| `MAX_LAYERS`,`MAX_SIZE`,`BP_SMAX` | число слоёв (`Infinity`) / сторона холста / размер кисти |

## `core/bus.js` — события

`on(event, fn) → off()` подписаться · `emit(event, payload)` послать. Список
событий — в [architecture.md](architecture.md).

## `logic/color.js` — цвет (чистый)

`hexToRgb` · `rgbToHex` · `rgb` (→ `rgb(r,g,b)`) · `eqc` (равенство по RGB,
игнорит альфу) · `rgbToHsv` · `hsvToRgb`.

## `logic/tint-shade.js` — оттенки и гармонии (чистый)

`generateTints(base)` / `generateShades(base)` — 5 цветов (база + 4 шага).
`generateHarmonyBaseColors(base, type)` — доп. базы по тону.
`generateTintShadeScalesForHarmony(base, type)` — `{base,tints,shades}[]`.
Шаги/углы — `config/tint-shade.js`.

## `logic/math.js` — числовые помощники (чистый)

`clamp(v,min,max)` · `clamp01(v)` (0..1) · `clamp255(v)` (0..255) · `clampRound(v,min,max)` (зажим с округлением). **Не пиши `Math.max(a, Math.min(b, v))` локально.**

`evalNumericField(v,base,{relativeMinus})` · `isNumericLiteral(v)` — выражения в числовых полях (`+8`, `/2`, `32+16`) без `eval`; относительные операции считаются от `base`.

## `logic/raster.js` — пиксельная сетка (чистый)

| Функция | Назначение |
|---------|-----------|
| `parseKey("x,y")` | `→ [x,y]`; разбор ключей `ext`. Не парси вручную. |
| `blendOver(s,d,sa)` | source-over: `s` (множитель альфы `sa`) поверх `d` |
| `mergeCells(b,t,op)` | пиксель `t` (непрозрачность `op`) поверх `b` |
| `cloneGrid(g)` | глубокая копия сетки (клетка `[r,g,b,a]`/`null`). Канон тут; `core/history.js` реэкспортирует |
| `gridBounds(g)` | охват непустых клеток `{minx,miny,maxx,maxy}` или `null` |
| `alphaBounds(data,W,H)` | охват непрозрачных пикселей RGBA-буфера (Trim/экспорт; учитывает запечённые эффекты) |
| `symmetrizeGrid(g,v,h)` | зеркалит опорную половину по осям |

## `logic/text-model.js` — текстовые слои (чистый)

`normalizeTextSource(src, defaults?)` — каноническая модель текста.
`moveTextSource(src,dx,dy)` — сдвиг прямоугольника текста в клетках.
`transformTextSource(src,tr)` — применить перенос/масштаб/поворот Free Transform к живому тексту.
`textLayerName(value,fallback?)` — имя слоя из введённого текста.
`cloneTextSource(src)` — копия для истории/дубликата слоя.
`isTextLayer(layer)` — проверка слоя перед текстовыми операциями.

## `logic/text-layout.js` — раскладка текста (чистый)

`displayText(src)` / `displayLines(src)` — отображаемая строка с учётом `uppercase`.
`lineAdvance(src)` — шаг строки в пикселях.
`lineWidth(src,line,measure)` / `maxLineWidth(src,measure)` — ширина с учётом межбуквенного интервала.

## `logic/flood.js` — области заливки (чистый)

`floodRegion(grid,x,y,canVisit?)` — клетки связной области на произвольной сетке; `canVisit(x,y)` ограничивает обход, например выделением-маской.

## Сервисы `core/` (портируются — см. systems.md)

Эти куски были продублированы в монолите по 3–6 раз; в модулях они существуют
строго в одном месте. Не воссоздавай локально:

| Помощник | Что делает | Заменяет дубли в |
|----------|-----------|------------------|
| `compositeLayers(ctx)` / `paintStack(ctx,live,{include,showHidden})` | композит слоёв (обтравка + эффекты слоёв/папок); `include(i)` ограничивает состав, `showHidden` игнорит видимость — для экспорта подмножеств | экспорт PNG/PSD, окно-превью, рендер |
| `layerSrcCanvas(i)` / `layerFxCanvas(i)` | canvas слоя с его неразрушающими эффектами (кеш по подписи) | композит, рендер |
| `saveFile(blob,name,mime,desc,overlay?)` | диалог→share→скачивание | весь экспорт |
| `placeImageLayer(w,h,data)` | RGBA-картинка новым слоем по центру | импорт, «слой из картинки» |
| `showMenuAt(el,ax,ay,above?)` | меню-бабл у якоря (ax,ay) с треугольником-указателем; единый вид всех меню | все контекстные меню (ctx/lctx/cctx/setmenu) |
| `createLibraryDialog(opts)` | единый каркас окна «сохранить/загрузить библиотеку»: `.ovl > .sheet`, шапка `.pop-head`, крестик, строка имени и список | менеджер палитр, менеджер тайлсетов |
| `floatingWindow(el,opts)` | drag за грип + resize за уголок + localStorage | палитра, боковая панель, окна слоёв/превью/референса |
| `core/pan-zoom.js` → `attachPanZoom(cv, view, opts)` | пан/зум двумя пальцами и колесом | холст, превью, референс |
| `markDirty(i)` / `layerCanvas(i)` | кеш слоя в `canvas` и его инвалидация | рендер, миниатюры, экспорт |
| `core/swipe-actions.js` → `attachSwipe(row, {actions, onSwipeRight?, guard?})` | свайп-влево (только тач) — липкая панель кнопок; свайп-вправо — разовый жест; открыта одна строка | «Новый холст» (правка/удаление), слои (Замок/Дубл./Удалить + выбор) |
| `core/swipe-actions.js` → `closeSwipe()` | закрыть открытую свайп-строку | при ре-рендере списков |
| `core/drag-ghost.js` → `dragGhost(el, width)` | клон элемента-призрака под курсором (`{move,remove}`) | перетаскивание плиток галереи и строк слоёв |
| `core/reorder-drag.js` → `attachReorder(el, {dropSel,itemSel,save,squelch})` | перестановка по тем же механикам, что цвета палитры (долгий тап/ПКМ) | кнопки тулбара и сайдбара |
| `core/canvas.js` → `makeCanvas(w,h)` / `paintCanvas(w,h,fill)` / `fillMask(d,mask,w,h,color)` | пустой canvas · canvas из ImageData (`fill(data)`) · заливка RGBA-буфера по булевой маске цветом `[r,g,b,a]` | кеш слоёв, эффекты, трансформация, поворот, курсор, иконки кистей |
| `core/io.js` → `gridToCanvas(grid,x0,y0,w,h)` | фрагмент сетки → canvas с попиксельной альфой | экспорт-фрагменты |
| `core/env.js` → `isDesktop()` | `(hover:hover)` — мышь vs тач; свайпы только на таче | слои, «Новый холст» |
| `core/image.js` → `imageData(im,w,h,smooth)` / `looksPixelArt(im)` | растеризация картинки + эвристика «это пиксель-арт» | импорт, Photo в галерее |
| `core/numeric-field.js` → `setNumericField` / `numericFieldValue` / `commitNumericField` | DOM-обвязка для числовых полей с мини-математикой (`+8`, `*2`, `/2`) | размеры нового холста, кроп, сетка |
| `core/grid.js` → `ensureGrid` / `gridCellW` / `gridCellH` / `setGridVisible` | нормализация состояния обычной Grid-сетки и единая смена видимости | Canvas size, render overlay, совместимый `grid.open` |
| `core/canvas-bounds.js` → `canvasContentBounds` | границы содержимого холста с учётом `ext` и эффектов слоёв/папок | Trim и кнопка Trim внутри Canvas size |
| `core/app-folders.js` → `readAppFiles(kind)` / `writeAppFile(kind,name,file)` | папки `fonts`/`palettes`: File System Access + сохранённый handle | библиотека шрифтов, пресеты палитр |
| `core/font-store.js` → `loadFonts()` / `importFontFile(file)` | единый список шрифтов: встроенные, папочные, импортированные через приложение | текстовый инструмент, библиотека шрифтов |
| `core/palette-files.js` → `allFolderPalettes()` / `savePaletteToFolder(name,colors)` | PNG-палитры из папки и сохранение полосы с клетками 32×32 | менеджер палитр |
| `core/text-layer.js` → `makeTextLayer(opts)` / `updateTextLayerGrid(layer)` | текстовый слой → пиксельная сетка с кешем растра | текстовый инструмент, история/рендер |
| `core/text-rasterize.js` → `rasterizeActiveText()` / `rasterizeTextTargets(targets)` / `rasterizeMatchingText(predicate)` | единая растризация живого текста перед пиксельными действиями | рисование, выделение, recolor, tilemap |
| `core/text-prefs.js` → `loadTextPrefs()` / `saveTextPrefs(prefs)` | последние выбранные шрифт/размер/цвет текста | библиотека шрифтов |

> На время миграции часть этих помощников ещё живёт в `js/00-util.js`
> (классическая сборка). Канон — версии в `src/`. При портировании системы
> переноси вызовы на модульные.

## Кросс-срезы

| Ресурс | Как использовать |
|--------|------------------|
| `config/*` → `MAX_LAYERS`, `SIZE_PRESETS`, `GLOW_DEFAULT`, `LONG_PRESS_MS`… | любое настраиваемое значение (см. [config.md](config.md)) |
| `core/actions.js` → `register(name, fn)` / `run(name)` | команда по имени для хоткея/кнопки/меню (см. [keymap.md](keymap.md)) |
| `i18n` → `t('ключ', vars?)` | любая UI-строка; тексты в `locales/*` (см. [i18n.md](i18n.md)) |
| `styles/tokens.css` → `var(--col-…)`, `var(--btn)` | любое значение стиля (см. [theming.md](theming.md)) |

## Антипаттерны (так не делать)

- Ручной разбор `k.indexOf(',')` вместо `parseKey`.
- Свой цикл альфа-смешивания вместо `blendOver`/`mergeCells`.
- Свой цикл `for layers … drawImage` вместо `compositeLayers`.
- Ручной `createElement('canvas')`+`createImageData`+`putImageData` вместо `makeCanvas`/`paintCanvas`.
- Свой сканер охвата `if(x<x0)x0=x…` вместо `gridBounds`.
- Своя обвязка drag/resize окна вместо `floatingWindow`.
- Прямой импорт другой системы вместо `bus.emit(...)`.
- Зашитая строка в UI вместо `t(...)`; зашитый цвет/размер вместо токена.
- Магическое число (предел/пресет/дефолт/тайминг) вместо значения из `config/*`.
- Разбор клавиш в системе вместо `keymap` + `actions`.
