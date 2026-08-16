# Animator / Frame Animation

Цель: простой покадровый Animator для пиксель-арта, который ощущается как
родная часть редактора, но не живёт внутри панели слоёв. Активный кадр
редактируется обычными инструментами через существующие `S.layers`, а Animator
управляет временем: кадры, таймлайны, playback, onion-skin, GIF import и
экспорт.

Главная формула: **слои описывают кадр, таймлайн описывает порядок кадров,
Animator управляет временем**.

---

## 0. Пользовательский контракт

- Animator открывается отдельной иконкой в верхней панели рядом с Reference.
  Рядом с кнопкой нет постоянной текстовой подписи; при наведении показывается
  обычный tooltip, как у остальных кнопок.
- Когда Animator включён, кнопка голубая как остальные активные toggles; когда
  выключен, кнопка выглядит как обычная кнопка панели.
- Таймлайн находится в отдельном нижнем dock/panel, не в панели слоёв. Окно
  Animator можно передвигать.
- Animator использует существующие стили окон, токены и `floatingWindow`, не
  вводит новый визуальный язык.
- Закрытие Animator только прячет панель; работа в нём остаётся в документе и
  автосейве.
- Можно создать кадр и выбрать кадр кликом по таймлайну.
- Когда выбран кадр, обычная панель слоёв работает как сейчас: можно рисовать,
  двигать пиксели, передвигать слои, группировать, менять видимость, opacity,
  effects, tilemap cells. Всё это относится к выбранному кадру.
- Если на кадре выключить глаз слоя, слой скрыт именно на этом кадре. На другом
  кадре у того же по смыслу слоя может быть другая видимость.
- Duplicate Frame создаёт независимую глубокую копию конкретного состояния
  слоёв кадра.
- Кадры можно перетаскивать на таймлайне, меняя порядок.
- Если кадров больше, чем помещается в Animator dock, таймлайн прокручивается
  горизонтальной полосой снизу.
- Перестановка кадров использует тот же механизм, что свотчи палитры и тайлы в
  tileset: `core/reorder-drag.js`.
- ПКМ по кадру открывает меню: Duplicate Frame, Delete Frame, Insert Before,
  Insert After, Set Duration. На touch то же меню открывается долгим тапом.
- Playback поддерживает `once`, `loop`, `pingpong`.
- Playback проигрывается в основном canvas, там же где пользователь рисует.
  Таймлайн снизу только управляет playhead и кадрами.
- Onion-skin включается из Animator и показывает соседние кадры поверх холста:
  предыдущие кадры рисуются полупрозрачным синим ghost-слоем.
- Можно добавить дополнительный таймлайн, переключать таймлайны и
  переименовывать их.
- Drag/drop GIF в редактор или галерею сразу создаёт/открывает Animator и
  раскладывает GIF по кадрам таймлайна.
- Экспорт Animator включает sprite sheet / tileset PNG, покадровый PNG export и
  `animation.json`.

---

## 1. Acceptance Checklist

- [ ] Animator и таймлайн не находятся внутри панели слоёв.
- [ ] Кнопка Animator стоит сверху рядом с Reference.
- [ ] Рядом с кнопкой Animator нет постоянной текстовой подписи.
- [ ] У кнопки Animator есть tooltip при наведении, как у остальных кнопок.
- [ ] Включенная кнопка Animator голубая, выключенная выглядит как обычная
  кнопка панели.
- [ ] Окно Animator можно передвигать.
- [ ] Animator использует существующие стили окон и дизайн-токены, без нового
  визуального языка.
- [ ] Закрытие Animator не сбрасывает кадры, таймлайны, выбранные кадры,
  visibility слоёв, durations, onion-skin и playback mode.
- [ ] Можно создать кадр.
- [ ] Можно выбрать кадр.
- [ ] Обычные операции со слоями работают на активном кадре: рисование, move
  tool, reorder слоёв, folders, visibility, opacity, effects, tilemap cells.
- [ ] Видимость слоёв сохраняется отдельно для каждого кадра.
- [ ] Duplicate Frame делает глубокую независимую копию состояния слоя/папок.
- [ ] Можно перетаскивать кадры на таймлайне.
- [ ] При большом количестве кадров таймлайн имеет горизонтальную прокрутку
  снизу.
- [ ] Reorder кадров использует общий механизм `attachReorder`, как свотчи и
  tileset tiles.
- [ ] ПКМ/long-tap меню кадра содержит duplicate и delete.
- [ ] Можно создать дополнительный таймлайн.
- [ ] Можно переключать таймлайны.
- [ ] Можно переименовывать таймлайны.
- [ ] Playback умеет loop.
- [ ] Playback умеет ping-pong.
- [ ] Playback идёт в основном canvas, а не в отдельной панели предпросмотра.
- [ ] Onion-skin показывает соседние кадры без изменения текущего кадра.
- [ ] Предыдущий кадр в onion-skin отображается полупрозрачным синим.
- [ ] Скрытые на кадре слои не участвуют в playback, onion-skin и export этого
  кадра.
- [ ] GIF drag/drop не импортирует GIF как статичную картинку, а сразу кладёт
  его в Animator.
- [ ] GIF delays переносятся в durations кадров.
- [ ] Есть экспорт как tileset/sprite sheet.
- [ ] Есть покадровый экспорт, желательно одним ZIP, а не десятками отдельных
  сохранений.
- [ ] Реализация переиспользует `paintStack`, `cloneLayer`, `cloneFx`,
  `attachReorder`, `showMenuAt`, history, gallery autosave, storage, export/io.
- [ ] Нет отдельного “animation layer”, дубля панели слоёв или второго рендера
  композита.

---

## 2. Модель данных

Animator хранится в документе. UI может быть закрыт, но данные остаются.

```
S.animator = {
  open: false,
  activeTimelineId,
  frameSeq,
  timelineSeq,
  timelines: [
    {
      id,
      name,
      frameIds,
      fps,
      mode,              // once | loop | pingpong
      selectedFrameId
    }
  ],
  frames: {
    [id]: {
      id,
      name,
      duration,          // ms; если null, берём fps таймлайна
      layers,
      folders,
      bg,
      cur,
      layerSeq,
      folderSeq
    }
  },
  onion: {
    on,
    prev,
    next,
    opacity
  }
}
```

Если `S.animator` отсутствует, документ работает как обычный плоский документ.
При первом открытии Animator текущие `S.layers`, `S.folders`, `S.bg`,
`S.cur`, `S.layerSeq`, `S.folderSeq` становятся кадром 1 первого таймлайна.

### Активный кадр

Активный кадр проецируется в существующие поля редактора:

```
frame.layers  -> S.layers
frame.folders -> S.folders
frame.bg      -> S.bg
frame.cur     -> S.cur
```

Системы рисования, слоёв, эффектов, tilemap и selection продолжают работать с
`S.layers` как сейчас. Перед переключением кадра Animator вызывает
`saveActiveFrame()`, затем `loadFrame(nextFrameId)`.

### Deep Copy Boundary

`loadFrame()` и `saveActiveFrame()` не должны передавать ссылки напрямую.

- `layers` копируются через `cloneLayer`.
- `folders` копируются с `cloneFx`.
- `bg` копируется отдельным объектом.
- `layerSeq` и `folderSeq` сохраняются вместе с кадром.
- transient-состояние (`sel`, `selFloat`, `moveDrag`, `rotMode`, `cropMode`,
  `fxSel`, `marked`, `tileSel`) не хранится в кадре и сбрасывается при
  переключении.

Без этой границы Duplicate Frame будет ломаться: правка копии случайно начнёт
менять исходный кадр.

---

## 3. Самые важные инварианты

### 3.1 Layer Operations Are Per-frame

Эти действия меняют только активный кадр:

- рисование и стирание;
- move tool и transform содержимого слоя/выделения;
- reorder слоёв и folders;
- visibility/opacity/lock/alphaLock/clip/reference;
- layer effects;
- tilemap cells;
- merge/duplicate/delete layer;
- folder operations.

Технически это бесплатно: активный кадр уже лежит в `S.layers`, а все эти
системы мутируют именно `S.layers`.

### 3.2 Canvas Operations Are All-frames

Размер холста общий для документа. Эти операции должны применяться ко всем
кадрам всех таймлайнов:

- resize / expand canvas;
- crop canvas;
- rotate canvas;
- trim animation.

`Trim` для Animator должен использовать union bounds активного таймлайна или
явно спрашивать пользователя `Active Frame` / `Active Timeline` / `All
Timelines`. MVP: trim по union bounds активного таймлайна.

Если применить crop только к одному кадру, playback/export получат кадры
разного размера. Это запрещено.

### 3.3 Document-global Data

Эти данные остаются общими для документа:

- `W`, `H`;
- palette и active color;
- tilesets как source pixel library;
- reference board;
- settings/tool preferences.

Tilemap cells хранятся в слое кадра, но tilesets глобальны. Поэтому правка
source tile обновит все кадры, где этот tile используется. Это ожидаемое
поведение для tileset workflow. Если нужно отделить конкретный кадр, нужна
команда Make Unique для tile/source.

### 3.4 Playback Is Not Editing

Playback не должен:

- писать history snapshot на каждый тик;
- запускать autosave на каждый тик;
- менять selectedFrame как пользовательское редактирование, если это только
  playhead.

Нужны разные события:

- `animation` - модель Animator изменилась и нужна перерисовка UI/autosave;
- `animation-playhead` - playback показал другой кадр, это не правка;
- `animation-frame-loaded` - ручной выбор кадра загрузил кадр в редактор.

### 3.5 Autosave Must Flush Active Frame

Перед записью документа `systems/gallery/doc.js` должен вызывать
`saveActiveFrame()`. Иначе последние мазки могут жить только в `S.layers`, а
`S.animator.frames[id]` останется старым.

То же правило для закрытия Animator, перехода в галерею, export, undo/redo и
переключения таймлайна.

### 3.6 History Must Be Scoped

Нельзя класть весь `S.animator` в каждый обычный `snapshot()`. На большом
проекте один мазок начнёт копировать все кадры и память закончится быстро.

Нужна animation-aware history:

- content edit: snapshot только активного кадра;
- frame operation: snapshot затронутых frame ids и timeline metadata;
- canvas operation: snapshot всех кадров, потому операция реально all-frames;
- tileset source edit: snapshot tilesets и затронутых tilemap layers/frames.

Восстановление history должно обновлять и live `S.layers`, и сохранённый
`S.animator.frames[activeFrameId]`, если восстановлен активный кадр.

### 3.7 Caches Are Required

Frame thumbnails, onion-skin и playback не должны каждый раз полностью
перезагружать кадры и пересобирать композит.

Нужен cache:

```
animationCache.frameCanvas[frameId] = { rev, canvas }
animationCache.thumb[frameId] = { rev, canvas }
```

`rev` кадра растёт при сохранении активного кадра, изменении frame data или
all-frame canvas operation. Onion-skin и thumbnails рисуют из cache.

---

## 4. Модули

### `config/animation.js`

Дефолты: fps, duration, loop mode, onion prev/next/opacity, max frames,
thumbnail size.

### `logic/animation-data.js`

Чистые операции над моделью: normalize, create frame, duplicate frame, delete
frame, reorder frameIds, create timeline, rename timeline, delete timeline,
duplicate timeline, garbage collect unused frames.

### `logic/gif.js`

Нормализованный decoder GIF: frames, delays, disposal, transparency, loop
count. Декодер должен быть покрыт тестами на disposal modes. Если берётся
готовый decoder, он прячется за этим модулем/адаптером, чтобы остальная система
не знала его API.

### `core/animation.js`

Мост `Animator <-> S.layers`: ensureAnimator, activeTimeline, activeFrameId,
saveActiveFrame, loadFrame, selectFrame, createFrame, duplicateFrame,
deleteFrame, createTimeline, renameTimeline, switchTimeline, renderFrameToCanvas.

`renderFrameToCanvas(frameId)` должен использовать существующий `paintStack`.
Если для этого временно подменяется `S.layers`, подмена должна быть без bus
events и с обязательным restore текущего live state.

### `core/animation-history.js`

Тонкая обвязка для scoped snapshots Animator. Не дублирует `core/history`, а
даёт ему payload для animation-aware undo/redo.

### `systems/animation/panel.js`

Отдельный нижний dock на существующих стилях окна: open/close, drag/position via
`floatingWindow`, play controls, loop mode, fps, onion toggle, timeline
selector, create/rename timeline, create frame, export.

### `systems/animation/timeline.js`

Плитки кадров, selection, thumbnails, horizontal scroll-row, drag reorder через
`attachReorder`.

### `systems/animation/frame-menu.js`

ПКМ/long-tap меню кадра через `showMenuAt`: duplicate, delete, insert before,
insert after, set duration.

### `systems/animation/playback.js`

Play/pause, once/loop/pingpong, duration/fps timing. Не пишет обычную историю
и не триггерит autosave на каждый тик.

### `systems/animation/onion.js`

Overlay onion-skin через `bus.on('overlay')`. Рисует cached canvases соседних
кадров с opacity, не меняет основной renderer. Предыдущие кадры тонируются в
синий цвет и рисуются полупрозрачно; текущий кадр остаётся в обычных цветах.

### `systems/animation/gif-import.js`

Обрабатывает `.gif`/`image/gif` из editor/gallery drop. Создаёт новый timeline
или новый документ с Animator в зависимости от контекста и размера.

### `systems/animation/export.js`

Sprite sheet / tileset PNG, `frames.zip`, `animation.json`. Рендер кадров
через `renderFrameToCanvas`.

### `core/zip-write.js`

Минимальный writer ZIP для покадрового экспорта. Текущий `core/zip.js` только
читает архивы, поэтому для `frames.zip` нужен отдельный writer.

---

## 5. Потоки

### Создать кадр

```
click +Frame
  -> saveActiveFrame()
  -> duplicate active frame by default
  -> insert new frame id after selected frame
  -> selectFrame(newId)
  -> emit animation/layers/render
```

По умолчанию `+Frame` дублирует текущий кадр. Дополнительные варианты меню:
Blank Frame, From Visible Composite.

### Выбрать кадр

```
click frame tile
  -> flush transient state or cancel unsafe tool state
  -> saveActiveFrame()
  -> loadFrame(frameId)
  -> timeline.selectedFrameId = frameId
  -> dirtyAll()
  -> emit layers/render/animation-frame-loaded
```

Перед переключением нужно закрыть/осадить незавершённые состояния: floating
selection, transform, crop, active stroke.

### Дублировать кадр

```
Duplicate Frame
  -> saveActiveFrame()
  -> deep clone frame
  -> insert cloned id after source id
  -> select cloned frame
```

Правка копии не должна менять исходный кадр.

### Удалить кадр

```
Delete Frame
  -> snapshot frame operation
  -> remove frame id from active timeline
  -> delete frame data if no timeline references it
  -> select nearest frame
```

Удаление последнего кадра таймлайна запрещено или заменяется созданием blank
frame. MVP: запрещено, показываем toast.

### Перетаскивание кадров

```
drag frame tile
  -> attachReorder mutates DOM order
  -> save order to activeTimeline.frameIds
  -> emit animation
```

Frame ids не меняются; меняется только порядок. Механика та же, что у swatches
и tileset tiles: долгий тап на touch или desktop drag gesture, общий ghost,
общие drop gaps. При количестве кадров больше ширины dock используется
горизонтальный scroll; drag не должен ломать scroll.

### Переименовать таймлайн

```
Rename Timeline
  -> saveActiveFrame()
  -> renameTimeline(timelineId, name)
  -> emit animation
```

Переименование не трогает кадры.

### Переключить таймлайн

```
select timeline
  -> saveActiveFrame()
  -> activeTimelineId = id
  -> load selectedFrameId of new timeline
  -> emit layers/render/animation
```

MVP: кадры не шарятся между таймлайнами. Новый таймлайн получает свои кадры,
чтобы правка `Walk` не меняла `Idle` случайно.

### Drop GIF

```
drop image/gif
  -> detect before ordinary image import
  -> decode frames/delays/disposal/loop
  -> create timeline from decoded frames
  -> set duration per frame
  -> set mode from loop count when possible
  -> load first frame
  -> open Animator dock
```

Policy:

- drop in gallery: создать новый документ размера GIF и открыть Animator;
- drop in editor with same size: добавить новый timeline в текущий документ;
- drop in editor with different size: предложить New Animated Document или
  Resize Current Document; MVP может выбрать New Animated Document без диалога.

Каждый GIF frame в MVP становится одним pixel layer `Frame`. Позже можно
добавить import as layer stack, но не в первой версии.

---

## 6. Экспорт

### Sprite Sheet / Tileset PNG

Кадры активного таймлайна раскладываются сеткой. JSON рядом хранит:

```
{
  "timeline": "Walk",
  "frameW": 64,
  "frameH": 64,
  "fps": 12,
  "mode": "loop",
  "columns": 8,
  "frames": [
    { "id": 1, "name": "1", "duration": 83, "x": 0, "y": 0, "w": 64, "h": 64 }
  ]
}
```

### Frames ZIP

Покадровый export должен сохранять один `frames.zip`:

```
frame_000.png
frame_001.png
animation.json
```

Сохранение десятков PNG отдельными диалогами не подходит для реального
workflow.

### Future Formats

GIF/WebP/APNG export можно добавить отдельной фазой. MVP не зависит от них,
потому sprite sheet и frames zip уже покрывают game/dev pipeline.

---

## 7. Риски и решения

| Риск | Решение |
|------|---------|
| History копирует все кадры на каждый мазок | Scoped animation history, обычный edit хранит только активный кадр |
| Autosave теряет последние мазки | `record()` перед сохранением вызывает `saveActiveFrame()` |
| Duplicate Frame связан ссылками с исходником | Deep clone через `cloneLayer`/`cloneFx` |
| Crop только активного кадра ломает размеры | Canvas operations применяются ко всем кадрам |
| Playback вызывает autosave/snapshot на каждый тик | Отдельное событие `animation-playhead` |
| Onion-skin тормозит | Cached frame canvases по frame revision |
| GIF disposal отображается неверно | Decoder нормализует full frames и покрыт тестами |
| Таймлайны случайно правят общие кадры | MVP не шарит frames между таймлайнами |
| Tileset source edit неожиданно меняет все кадры | Это документный source; для отделения нужна Make Unique |

---

## 8. Фазы реализации

**Фаза 1 - модель, clone и scoped save.**
`config/animation.js`, `logic/animation-data.js`, `core/animation.js`.
Создать Animator из текущего документа, создать/выбрать/дублировать/удалить
кадр, сохранить per-frame visibility, deep copy, `layerSeq/folderSeq`.

**Фаза 2 - history/storage/autosave.**
Animation-aware snapshot payload, `saveActiveFrame()` перед gallery record,
restore active frame, tests на memory-safe snapshot scope.

**Фаза 3 - Animator UI.**
Иконка рядом с Reference без постоянной подписи, tooltip при наведении,
голубое active-состояние, нижний передвигаемый dock на существующих стилях,
timeline thumbnails, `+Frame`, выбор кадра, close/open без потери состояния.

**Фаза 4 - frame menu, scroll и reorder.**
ПКМ/long-tap меню кадра, duplicate/delete/insert/duration, drag reorder через
`attachReorder`, горизонтальный scroll при большом количестве кадров.

**Фаза 5 - per-frame editing QA.**
Проверить, что draw/move/reorder/folders/effects/tilemap cells работают только
на активном кадре. Canvas resize/crop/rotate применить ко всем кадрам.

**Фаза 6 - playback и onion-skin.**
Play/pause, once/loop/pingpong, duration/fps, cached onion overlay.

**Фаза 7 - несколько таймлайнов.**
Create/rename/delete/duplicate timeline, switch timeline, selected frame per
timeline, no shared frames in MVP.

**Фаза 8 - GIF import.**
Detect `.gif`/`image/gif` before ordinary import, decode frames/delays/disposal,
create/open Animator, set durations, handle editor/gallery policy.

**Фаза 9 - export.**
Sprite sheet / tileset PNG, `frames.zip`, `animation.json`.

---

## 9. Рабочий план Codex

Перед реализацией читать:

- `docs/architecture.md`
- `docs/systems.md`
- `docs/utilities.md`
- `docs/i18n.md`
- `docs/config.md`
- этот документ

Проверить точки интеграции:

- `core/state.js`
- `core/history.js`
- `core/layer-cache.js`
- `core/composite.js`
- `core/document.js`
- `systems/gallery/doc.js`
- `systems/gallery/index.js`
- `systems/import/*`
- `systems/export/*`
- `systems/render/index.js`
- `systems/toolbars.js`
- `core/floating-window.js`
- `systems/layers/*`
- `systems/tilemap-export.js`

Тесты и QA:

- unit: normalize/create/duplicate/delete/reorder frame;
- unit: rename/create/delete timeline;
- unit: duplicate frame deep copy;
- unit: per-frame visibility restore;
- unit: scoped history does not clone unrelated frames for content edit;
- integration: autosave flushes active frame;
- integration: canvas resize applies all frames;
- integration: GIF drop routes to Animator;
- browser QA: create/select frame, per-frame layer visibility, draw/move/reorder
  scoped to current frame, duplicate frame, loop, pingpong, onion-skin, ПКМ
  duplicate/delete, timeline horizontal scroll with many frames, drag reorder
  using shared swatch/tile mechanics, close/open Animator, add/rename timeline,
  movable Animator window, top button tooltip and active/inactive states, drop
  GIF, sprite sheet export, frames zip export.
