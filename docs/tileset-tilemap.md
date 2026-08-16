# Tileset / Tilemap — дизайн и план разработки

Система тайлов в духе **Aseprite Tiles**: пользователь создаёт тайлы в палитре,
рисует ими на специальном tilemap-слое, правит исходный тайл — и все его
экземпляры на холсте обновляются автоматически.

> North star (CLAUDE.md): «Procreate для пиксель-арта». Tile-режим должен
> ощущаться как родная часть редактора: те же жесты, та же панель слоёв,
> тот же холст — просто слой нового типа.

---

## 0. Главный архитектурный принцип интеграции

В приложении **весь пайплайн читает пиксельную сетку слоя `L.grid`** (`H×W`
массив `[r,g,b,a]|null`):

- `core/layer-cache.js` → `layerCanvas(i)` растеризует `L.grid` в canvas;
- `core/composite.js` → `paintStack`/`drawLayer` — единственная точка композита
  (видимый рендер, экспорт PNG/PSD, окно-превью, миниатюры слоёв);
- `core/history.js` → `snapState` клонирует `L.grid` через `cloneLayer`;
- `systems/gallery/doc.js`, `core/storage.js` — сериализуют `L.grid`.

**Решение:** tilemap-слой хранит источник истины отдельно
(`L.tilemap = { tilesetId, cells, mapW, mapH }` + маркер `L.kind = 'tilemap'`),
а `L.grid` держит **как кеш растеризации** этого tilemap. Grid пересобирается
из `cells` + тайлов тайлсета при любом изменении.

Что это даёт:

- **Рендер/композит/экспорт/миниатюры/окно-превью работают без единой правки** —
  они и дальше читают `L.grid`.
- «Обновить все экземпляры тайла» (§4, §6 задачи) = найти tilemap-слои,
  использующие `tileId`, **пересобрать их grid и `markDirty`**. Никаких
  изменений в пайплайне рендера.
- Соблюдается §17 задачи: пиксели тайла хранятся **один раз** в тайлсете,
  клетки держат только `tileId` + transform-флаги. `grid` — производный кеш,
  не источник истины.

Это снимает 80% риска фичи: мы не переписываем рендер, а добавляем модули,
которые кормят существующий рендер через уже существующий контракт `L.grid`.

---

## 1. Модель данных (расширения `core/state.js`)

### Tileset (в `S.tilesets`)

```
{
  id,                 // стабильный id тайлсета
  name,
  tileW, tileH,       // размер тайла (8/16/32/custom), фиксируется при создании
  tiles: [TileDef],   // см. ниже
  groups: [VariantGroup],
  tileSeq             // монотонный счётчик для стабильных tileId
}
```

### TileDef (тайл внутри тайлсета)

```
{
  id,                 // СТАБИЛЬНЫЙ tileId — не меняется при сортировке/
                      // переименовании/удалении соседей (§7 задачи)
  name,               // опционально
  groupId,            // id variant-группы или null
  weight,             // вес для random variant brush (по умолчанию из config)
  grid                // tileH×tileW пиксельная сетка (источник пикселей тайла)
}
```

Видимый индекс в палитре = позиция в массиве (может меняться). `tileId` живёт
в `id` и в клетках tilemap — никогда не привязываемся к позиции.

### VariantGroup

```
{ id, name, baseTileId }   // weight хранится на самом TileDef
```

### Cell (клетка tilemap-слоя)

```
{ tileId, flipX, flipY, diagonalFlip, rotation }   // rotation ∈ {0,90,180,270}
```

`tileId == null/undefined` → клетка пустая. Хранится плоским массивом
`mapW*mapH` (индекс `y*mapW+x`), пустые — `null` (память не тратится).

### Расширение фабрик слоя

`newLayer` и `cloneLayer` получают опциональные поля `kind` (`'pixel'` по
умолчанию) и `tilemap`. `cloneLayer` глубоко копирует `tilemap` (cells + meta).
Обычные слои не меняются — `kind:'pixel'`, `tilemap:undefined`.

### Новые поля `S` (старт-значения — из `config/tileset.js`)

- `S.tilesets`, `S.tilesetSeq` — библиотека и счётчик id тайлсетов;
- `S.activeTile` — `{ tilesetId, tileId|groupId }` — что рисует Tile Brush;
- `S.tileFlags` — `{ flipX, flipY, diagonalFlip, rotation }` — трансформ для
  следующих экземпляров (кнопки Flip H/V, Rotate, Diagonal);
- `S.tileSel` — выделение клеток `{ li, x0, y0, x1, y1 }` (отдельно от pixel
  `S.sel`);
- `S.tileEdit` — состояние открытого редактора source tile (или null).

---

## 2. Раскладка модулей (каждый ≤170 строк, одна задача)

### logic/ — чистые вычисления (без DOM, без state)

| Модуль | Одна фраза |
|--------|-----------|
| `logic/tile-transform.js` | применяет flip/diagonal/rotation к сетке тайла → новая сетка; компонует флаги при наложении |
| `logic/tilemap-raster.js` | собирает пиксельный `grid` слоя из cells + тайлов (через tile-transform) |
| `logic/tile-variants.js` | взвешенный случайный выбор tileId из группы (RNG передаётся аргументом) |
| `logic/tilemap-io.js` | сериализация/десериализация `tilemap.json` (структура из §15 задачи) |

### core/ — фундамент (общий, без UI)

| Модуль | Одна фраза |
|--------|-----------|
| `core/tileset.js` | TilesetManager: CRUD тайлов, стабильная выдача `tileId`, доступ к сетке тайла по id |
| `core/variant-groups.js` | CRUD variant-групп и весов поверх `S.tilesets` |
| `core/tilemap.js` | пересобирает `grid` tilemap-слоя из cells и `markDirty`; находит слои по `tileId` и обновляет все экземпляры |

> Граница: `core/tileset.js` отвечает «что за тайл», `core/tilemap.js` —
> «как он лёг на слой и как обновить». Если файл подходит к лимиту — дробим
> (напр. `tileset-crud.js` / `tileset-query.js`).

### systems/ — оркестрация (один процесс; связь только через state+bus)

| Модуль | Одна фраза |
|--------|-----------|
| `systems/tile-palette/*` | панель тайлов: превью, индекс, имя, группа; команды new/dup/delete/rename/variant/select |
| `systems/tile-brush/*` | инструмент Tile Brush: paint/erase/pick (далее fill/rect/line); guard «нужен tilemap-слой» |
| `systems/tile-editor/*` | изолированный редактор source tile tileW×tileH; коммит → обновить все экземпляры |
| `systems/tile-selection/*` | выделение клеток: rect, delete, copy/paste, Make Unique, Replace With Variants |
| `systems/tilemap-create.js` | диалог создания tilemap-слоя (tileset, tile w/h, map w/h в клетках) |
| `systems/tilemap-overlay.js` | оверлей сетки клеток активного tilemap-слоя (через событие `overlay`) |
| `systems/tilemap-export.js` | Bake to Pixel Layer; экспорт `tileset.png` + `tilemap.json` |

### config/ и i18n

- `config/tileset.js` — пресеты размера тайла (8/16/32/custom), дефолтные
  размеры карты, дефолтный weight, дефолты Tile Brush.
- `i18n/locales/{ru,en}.js` — все подписи/тосты/меню (паритет ключей). Ни одной
  зашитой строки (`t('tile.…')`). Тост-guard: `t('tile.needTilemapLayer')` =
  «Select a Tilemap Layer first».
- Стили панели/редактора — только токены (`src/styles/tokens.css`), при нужде
  добавить токены, без зашитых цветов/размеров.

---

## 3. Точки интеграции с существующим кодом (минимальные правки)

1. **`core/state.js`** — расширить `newLayer`/`cloneLayer` полями `kind` и
   `tilemap`; добавить поля `S.tilesets`/`S.activeTile`/`S.tileFlags`/
   `S.tileSel` со стартом из `config/tileset.js`.
2. **`core/history.js`** — `snapState` должен снимать `S.tilesets` (источник
   пикселей тайлов) и per-layer `tilemap`; `restore` — возвращать их.
   `cloneLayer` уже понесёт `tilemap`. Так undo/redo правок тайла и карты
   работают из коробки.
3. **`systems/gallery/doc.js` + `core/storage.js`** — сериализовать `S.tilesets`
   и `L.tilemap`; на загрузке старых проектов поле отсутствует → `kind:'pixel'`
   (миграция как для `effects`/`reference`).
4. **`systems/layers/list.js`** — в строке слоя показать тип (иконка
   tilemap-слоя) и пометить `kind`; миниатюра уже работает (читает `grid`).
   Создание tilemap-слоя — пункт в меню «+»/контексте слоёв (событие в bus,
   слушает `systems/tilemap-create.js`).
5. **`core/tools.js` + `core/canvas-handlers.js`** — зарегистрировать
   `tool.tilebrush` (и под-инструменты) как обычные инструменты; ввод уже
   диспетчеризует по `S.tool` без правок.
6. **`systems/render/index.js`** — НЕ трогаем композит; сетка клеток рисуется
   через уже существующее событие `overlay` (как рамка трансформации).
7. **`systems/export/*`** — Bake и export tilemap данных подключить как
   дополнительный scope/формат; рендер картинки уже даёт `compositeLayers`.

> Импортов система→система не вводим: Tile Palette ↔ Tile Brush ↔ Tile Editor
> общаются через `S.activeTile`/`S.tileFlags` и события bus
> (`tile-changed`, `tileset-changed`, `tilemap-changed`).

---

## 4. Потоки данных

### Place tile (§3–§4 задачи)

```
выбор тайла в палитре → S.activeTile + S.tileFlags + tool=tilebrush
pointerdown на холсте → input → toolHandler('tilebrush')
  → клетка (gx,gy) / tileW → cell (cx,cy)
  → core/tilemap: cells[cy*mapW+cx] = { tileId, ...S.tileFlags }
  → core/tilemap.rasterLayer(li): grid пересобран из cells (logic/tilemap-raster)
  → markDirty(li) → emit 'render'
```

### Правка source tile → авто-обновление всех экземпляров (§6 задачи)

```
двойной клик по тайлу в палитре → systems/tile-editor открывается
правка пикселей → TileDef.grid меняется
commit → core/tilemap.refreshTile(tilesetId, tileId):
  для каждого tilemap-слоя, где встречается tileId → rasterLayer + markDirty
  → emit 'render'   // цветок появился во всех клетках grass_01
```

### Make Unique (§5 задачи)

```
выделены клетки → core/tileset.cloneTile(tileId) → новый стабильный tileId
выбранные cells.tileId = новый id
rasterLayer + markDirty   // старые экземпляры старого tileId не тронуты
```

### Random Variant Brush / Replace With Variants (§11–§12 задачи)

```
S.activeTile.groupId задан → при штампе logic/tile-variants.pick(group, rng)
  → конкретный tileId с учётом weight
Replace: по выделению/всему слою заменить целевой tileId случайными из группы
  (только по явной команде)
```

---

## 5. Фазы разработки

Каждая фаза — рабочий коммит с проверкой, соразмерной риску (для фаз с логикой
и несколькими системами обычно `npm run lint` + `npm test`), приложение
поднимается, обычные (pixel) слои не сломаны. Дробим, чтобы не было god-файлов.

**Фаза 1 — Фундамент данных и растеризация (без UI).**
`config/tileset.js`; расширение `state` (фабрики, поля); `logic/tile-transform`,
`logic/tilemap-raster`; `core/tileset`, `core/tilemap`. Юнит-тесты в
`test/unit.mjs` на transform/raster/стабильность tileId. History snapState
учитывает tilesets+tilemap. **Проверка задачи: §7, §8, §17 (логика).**

**Фаза 2 — Tilemap-слой как тип слоя.** `systems/tilemap-create`; пометка типа
в `systems/layers/list.js`; рендер через существующий grid-кеш;
`systems/tilemap-overlay` (сетка клеток). **Проверка: §2, §6 (рендер как
индексная карта).**

**Фаза 3 — Tile Palette (MVP).** `systems/tile-palette/*`: список, превью,
индекс/имя/группа; команды new/dup/delete/rename/select. **Проверка: §1
(панель), §4, §18.4.**

**Фаза 4 — Tile Brush (MVP).** `systems/tile-brush/*`: Paint/Erase/Pick;
guard-тост на pixel-слое; transform-флаги (Flip H/V, Rotate, Diagonal) для
следующих экземпляров; Pick берёт tileId + флаги. **Проверка: §3 (минимум),
§8, §10–§14.**

**Фаза 5 — Edit Tile Source + авто-обновление.** `systems/tile-editor/*`:
изолированный редактор tileW×tileH (переиспользуем draw-пайплайн на временной
сетке тайла); коммит → `core/tilemap.refreshTile`. **Проверка: §6, §18.7.**

**Фаза 6 — Make Unique + Tile Selection (MVP).** `systems/tile-selection/*`:
rect-выделение клеток, delete, copy/paste, Make Unique. **Проверка: §5, §13,
§18.8–§18.9, §18.20.**

**Фаза 7 — Варианты.** `logic/tile-variants`; `core/variant-groups`; Auto
Variants в редакторе/палитре; Random Variant Brush; Replace With Variants
(по выделению/всему слою, только по команде). **Проверка: §9–§12, §16–§17.**

**Фаза 8 — Bake + Export.** `systems/tilemap-export`: Bake (Duplicate as Pixel
Layer / Convert to Pixel Layer); Export as image (уже есть composite); Export
`tileset.png` + `tilemap.json` (`logic/tilemap-io`); сериализация в галерее.
**Проверка: §14–§15, §18.21–§18.23.**

Порядок выбран так, что после Фазы 4 уже есть демонстрируемый сценарий
(создать тайл → нарисовать), а каждая следующая фаза опирается на предыдущую.

---

## 6. Готовность к будущему (§25 задачи)

Источник истины — `cells` (tileId + флаги) и тайлсет с группами. Это ровно та
модель, на которой строятся:

- **Autotiling / terrain tiles** — правила соседства поверх `cells` (новая
  `logic/autotile.js` + слушатель в `core/tilemap`), пиксели не трогаем.
- **Animated tiles** — TileDef получает кадры; растеризация выбирает кадр по
  таймеру. Совпадает с контрактом кадров анимации из `architecture.md`
  (документ = набор кадров) — tilemap встаёт в `S.frames` без слома плоского
  случая.

Эти расширения = «вставить модуль», т.к. рендер кормится через `L.grid`, а
логика тайлов изолирована в `logic/` + `core/tileset|tilemap`.

---

## 7. Чек-лист (маппинг на §18 задачи)

Покрытие пунктов проверки задачи по фазам:

- Создать tileset / размер тайла / tilemap-слой — Ф1–Ф2 (§18.1–18.3).
- Новый тайл, выбор и рисование, индексная карта — Ф3–Ф4 (§18.4–18.6).
- Авто-обновление source tile — Ф5 (§18.7).
- Make Unique и неизменность старых — Ф6 (§18.8–18.9).
- Flip/Rotate/Diagonal/Pick флаги — Ф4 (§18.10–18.14).
- Auto Variants / группы / random / replace — Ф7 (§18.15–18.19).
- Tile Selection — Ф6 (§18.20).
- Bake / Export image / Export data — Ф8 (§18.21–18.23).
- Без дублирования логики / готовность к autotiling — сквозь все фазы
  (§18.24–18.25): grid как кеш, логика в `logic/`, источник истины в
  `core/tileset|tilemap`.

---

## 7a. Доработки UI/поведения (паритет со свотчами + Godot-стиль)

- **Tilemap-слой как контекст**: выбор активного Tilemap-слоя автоматически
  открывает панель тайлов и включает сетку клеток; выбор обычного слоя, папки,
  эффекта или фона закрывает панель.
- **Палитра как свотчи**: превью в реальном размере тайла (16×16, 48×48), выбор
  клик/Shift-диапазон/Ctrl-мультивыбор, перестановка зажатой ЛКМ
  (`tile-palette/select.js`). Несколько выбранных тайлов = **паттерн** (как в
  Godot): штампуются с выравниванием по сетке (острова/замкнутые участки).
  Клик по тайлу включает **Place tile** и использует последний выбранный тайл.
  Кнопка **Random** (кубик) — случайные тайлы из выбранных.
- **Нижний тулбар** (SVG-иконки): **Place tile**, **Draw Tile**, **Edit tile**,
  Random, менеджер тайлсетов, Delete Tile.
- **Draw Tile/Edit tile по холсту** (`tilemap-paint`): Edit tile пишет в source
  тайла клетки (все экземпляры обновляются). Draw Tile создаёт новый tileId
  только для пустой клетки; если клетка уже ссылается на tileId, правится именно
  этот tileId без добавления нового тайла. Стёртая в ноль пустая клетка тайла не
  создаёт. Включение кисти/ластика или выбор цвета возвращает последний режим
  Draw Tile/Edit tile.
- **Crop/Resize холста**: tilemap-слой пересчитывает `mapW/mapH` по текущему
  размеру холста и переносит cells по tile-клеткам; новые клетки сразу
  доступны для Tile Brush.
- **ПКМ по клетке** (на Tilemap-слое): Flip H/V, Rotate 90/180/270, Diagonal,
  Clear Cell — трансформы экземпляра, не source.
- **Delete Tile vs Clear Cell**: Delete Tile (палитра, с подтверждением) удаляет
  tileId и чистит все экземпляры; Clear Cell чистит одну клетку.
- **Convert to Tilemap** (меню слоя): пиксельный слой → Tilemap-слой с
  дедупликацией (одинаковые блоки → один tileId); слой получает метку Tilemap
  рядом с глазом. Удаление слоя НЕ удаляет тайлы из палитры.
- **Merge Tilemap-слоёв**: если верхний слой в merge — Tilemap и размеры тайлов
  совместимы, результат остаётся Tilemap; клетки собираются в тайлы через дедуп,
  без превращения слоя в обычный пиксельный.
- **Дедуп**: одинаковые тайлы не добавляются (как одинаковые цвета палитры) —
  `addTileUnique`.
- **Менеджер тайлсетов** (`tileset-manager`): сохранить/переименовать/загрузить/
  удалить именованные тайлсеты (localStorage), как менеджер палитр.
- **Персистентность**: `S.tilesets` (id/индекс/bitmap/имя/порядок/группы) и
  клетки (tileId + flipX/flipY/diagonalFlip/rotation) сохраняются в проект и
  восстанавливаются (галерея `doc.js`).

## 8. Риски и решения

- **Производительность пересборки grid.** Растеризуем только изменённые клетки
  при штампе; полную пересборку — только при правке source tile (и только
  затронутые слои). `markDirty(li)` уже точечный.
- **Размер тайла после создания.** Менять размер существующего tileset —
  future feature (как разрешает задача). Фиксируем при создании.
- **Лимит 170 строк.** Панель/редактор/кисть заранее разложены на под-модули
  (`index/list/menu`, `paint/pick/flags` и т.п.).
- **История памяти.** В snapshot тайлсета пиксели тайлов клонируются; для
  больших библиотек — будущая оптимизация (хранить ревизию/дельты), контракт
  не меняется.
</content>
</invoke>
