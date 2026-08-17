# 01 — Подтверждённое текущее состояние

Baseline: `main@64ec94e`. Все числа ниже получены из
`src/app-folders/brushes/main/lineart.brush` и из кода на этом коммите.

## Как файл вообще попадает в движок

`index.html:550` → `src/legacy-entry.js` → сохранённый UI. Штрих `.brush` идёт
не через legacy stamp, а через типизированный путь:
`src/systems/draw/raster-brush.js:36` создаёт `StrokePipeline`, а
`renderSamples` вызывает `visitBrushDab` из
`src/core/brush/renderBrushDab.ts:41`. Размер и непрозрачность приходят из UI
(`S.brushes[tool].size`, `S.brushes[tool].op`), пресет даёт всё остальное.

Разбор файла — `src/core/brush/procreateBrush.ts:46`, маппинг архива —
`src/core/brush/brushArchiveSettings.ts:62`.

## Содержимое lineart.brush

```text
Brush.archive                      9912
Signature/SignaturePicture.png    19622
QuickLook/Thumbnail.png            3061
AuthorPicture/AuthorPicture.png  252273
Reset/...                        (сброшенная копия)
```

`Shape.png` и `Grain.png` в архиве **отсутствуют**. Вместо них:

```text
bundledShapePath = "Brush-Pocket-Brick.png"
bundledGrainPath = "Brush-Artery-Charcoal-Corse.jpg"
```

Это ссылки на встроенную библиотеку Procreate, которой в репозитории нет.
Из двенадцати бандлов ассеты внутри файла есть только у `freckles`,
`gundersen`, `pencil_waxy` (shape+grain) и `net_screentone`, `screentone`
(только grain). Остальные семь — включая обе `lineart` — ссылочные.

`Signature/SignaturePicture.png` — эталон авторского штриха: тонкая, ровная,
жёсткая линия без видимой фактуры и без разброса.

## Разрыв 1 — форма и зерно подменены процедурой (доминирующий)

`procreateBrush.ts:52` распаковывает только `Brush.archive`, `Shape.png`,
`Grain.png`. Обоих ассетов нет → `builtInBrushSource` (`procreateBrush.ts:77`).

- `src/logic/brush/builtinShapeSources.ts:54` для `brush-pocket-brick` отдаёт
  `brick()` — процедурный прямоугольник 256×256 с полуосями `0.48 × 0.82`,
  шумовым краем и случайными выколотыми точками. Это авторская выдумка, а не
  ассет Procreate.
- `src/logic/brush/builtinGrainSources.ts:36` для `brush-artery-charcoal-corse`
  отдаёт `charcoal(false)` — value-noise 256×256.

Плюс `hardness` формы берётся не из архива, а из ручного профиля
`src/config/bundledBrushes.ts:21` (`0.92`) и превращается в
`exponent = 1 + (1 - hardness) * 2 = 1.16`
(`src/logic/brush/brushCoverage.ts:66`), то есть покрытие ассета
дополнительно возводится в степень. У Procreate для image-формы такого
параметра нет — край задаёт сама картинка.

Пока этот разрыв открыт, никакая точная динамика не даст совпадения.

## Разрыв 2 — grain-тайл вырождается до 2×2

Архив даёт `textureScale = 0.13357694`, `grainDepth = 1.0`.
`src/logic/brush/grainTile.ts:6` при `scaleReference = 2048` и
`grainScaleDivisor = 16` (`src/config/brush-raster.json`) считает:

```text
targetSide = round(2048 * 0.13358 / 16) = 17
ratio      = 17 / 2048 = 0.0083
tile       = round(256 * 0.0083) = 2 x 2
```

Проверено численной симуляцией box-фильтра из `grainTile.ts`: итоговый тайл —
**2×2 пикселя**. При `grainDepth = 1.0` это не фактура, а почти константное
затемнение ~0.55 на весь холст. Для декодированных `Grain.png`
`scaleReference` не проставляется (`src/core/brush/decodeCoverage.ts:44`), так
что `reference = max(w, h)` и то же вырождение возможно у остальных кистей.

Дополнительно игнорируются `grainOrientation`, `grainBlendMode`,
`texturizedGrainFollowsCamera`, `textureOrientation`.

## Разрыв 3 — кривые отклика Procreate не читаются вовсе

В архиве десять `ValkyrieMagnitudinalCurve`. У `lineart` нелинейная ровно одна:

```text
dynamicsPressureOpacityCurve = {0,0} {0.293590, 0.565130} {1,1}
```

При нажиме 29 % Procreate даёт 57 % непрозрачности. ProDraw не читает ни один
ключ `*Curve` (в `supported` из `brushArchiveSettings.ts:10` их нет) и считает
линейно: `brushOpacity.ts:16` даёт `1 - k + k * pressure`. Ошибка на середине
диапазона нажима — около 27 процентных пунктов.

## Разрыв 4 — активные динамики не реализованы

`BrushCompatibilityReport.unsupportedActiveFields` для этого файла содержит
**44** записи. Значимые для внешнего вида:

| Ключ | Значение | Что даёт в Procreate |
| --- | --- | --- |
| `dynamicsJitterOpacity` | 0.3508 | подабный разброс непрозрачности |
| `dynamicsSpeedOpacity` | 0.1964 | скорость → непрозрачность |
| `dynamicsPressureOpacitySpeed` | 0.1905 | сглаживание отклика нажима |
| `dynamicsPressureSizeSpeed` | 0.1905 | то же для размера |
| `dynamicsTiltOpacity` | 0.8029 | наклон → непрозрачность |
| `dynamicsTiltGradation` | 0.1952 | градация наклона |
| `shapeAzimuth` | true | азимут пера как угол формы |
| `grainOrientation` | 1 | привязка зерна |

## Разрыв 5 — план даба и taper построены на эвристиках

- `shapeCount = 0.1909` → `dabStampPlan` через
  `archiveControlMappings.ts:54` даёт `count = 1 + round(0.1909 * 5) = 2`,
  потолок 6. Диапазон Count в Procreate — 1..16, так что маппинг угадан.
  Практический эффект: **каждый даб штампуется дважды**.
- `shapeScatter = 0.1918` умножается на размер кисти
  (`dabStampPlan.ts:35`), то есть два штампа ещё и разъезжаются. При работе на
  крупном размере линия распушается, у Procreate — нет.
- `shapeOrientation` одновременно питает `shape.relativeToStroke` и
  `properties.orientToScreen` через одно и то же условие
  (`archiveControlMappings.ts:52` и `:103`). Это взаимоисключающие понятия;
  при `shapeOrientation = 0` вращение формы отключается полностью, и
  `relativeToStroke` становится мёртвым.
- Хвостовой taper подделан: `taperResponse.ts:31` считает
  `endAmount = endLength * (1 - pressure)`, то есть сужает штрих везде, где
  нажим низкий, а не в конце. Настоящий конечный taper требует
  перерисовки хвоста при отрыве пера.
- Стартовая длина taper — эвристика `start * size * 4`
  (`taperResponse.ts:27`), калибровки к Procreate нет.
- `taperPressure` (touch-параметр) применяется и к перу, и к касанию
  (`archiveControlMappings.ts:28`).

## Разрыв 6 — домены размера/непрозрачности и композитинг

- `maxSize = 0.14780` превращается в `147.8 px` магическим множителем `1_000`
  (`brushArchiveSettings.ts:71`), `minSize = 0.006767` — в `1.0 px`.
  Калибровки к размеру холста Procreate нет.
- `paintSize = 0.00028` и `paintOpacity = 0.84375` — запомненные положения
  слайдеров Procreate — отбрасываются регуляркой `metadata`
  (`brushArchiveSettings.ts:34`). Кисть открывается не в том состоянии, в
  котором её сохранил автор; именно на `paintSize ≈ 0` нарисована подпись из
  архива.
- `minOpacity`/`maxOpacity` применяются как жёсткий clamp к базовой
  непрозрачности даба (`brushOpacity.ts:23`), а не как концы кривой нажима.
- `textureApplication = 0` → `RENDER_MODES[0] = "intense-blending"`
  (`archiveControlMappings.ts:89`). Порядок перечисления не сверен с
  Procreate, а `MODE_FACTOR` в `brushOpacity.ts:5` — подобранные константы.
- `renderingRecursiveMixing = true` не моделируется.
- `PixelOpacityAccumulator` сбрасывается на каждый `painter.flush()`, то есть
  на каждое pointer-событие (`raster-brush.js:31`). Один штрих ложится на слой
  много раз, поэтому самопересечение штриха темнеет. В Procreate штрих
  копится в отдельном буфере и композитится один раз.

## Безопасные предположения

- Владелец репозитория имеет лицензионный Procreate и купленные кисти, а
  репозиторий приватный и предназначен для личного использования: снятые
  ассеты и эталонные штрихи хранятся в git наравне со шрифтами и палитрами.
- `preset.sources.shape/grain` (`src/logic/brush/brushSourceAsset.ts:29`) уже
  умеет подменять покрытие из base64-ассета, значит канал доставки настоящих
  ассетов существует и не требует новой архитектуры.
- Порядок `RENDER_MODES` и маппинг `shapeCount` подлежат калибровке по
  эталону, а не переносу «как есть».
