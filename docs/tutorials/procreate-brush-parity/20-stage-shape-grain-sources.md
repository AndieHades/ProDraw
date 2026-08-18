# Stage PBP-2: настоящие shape и grain вместо процедуры

- Status: `completed`

## Проверенная раскладка

Опробована и откатана вместе с остальным подключением, см.
[`05-attempt-log.md`](05-attempt-log.md). Раскладка себя оправдала и остаётся
целевой. Владелец снял источники сам, поэтому библиотека адресуется не по имени
ассета Procreate, а по идентификатору кисти — так проще и не требует таблицы
имён:

```text
src/app-folders/sources/shape/<brush-id>.png
src/app-folders/sources/grain/<brush-id>.png
```

`<brush-id>` совпадает с `BrushPreset.id`, то есть с именем `.brush` без
расширения. Для `lineart.brush` это `sources/shape/lineart.png` и
`sources/grain/lineart.png`. Индекс собирается через
`import.meta.glob` в `src/config/brushSourceAssets.ts`, загрузка и кеш —
`src/core/brush/brushSourceFolder.ts`.

Приоритет: `preset.sources.*` → source library → ассет внутри архива → явно
помеченный `missing`. Процедурных shape/grain sources в цепочке больше нет.
Папка выигрывает у архива сознательно: это явное действие владельца и
единственный способ поправить source, не трогая `.brush`.

Одна и та же картинка для двух кистей дублируется (`lineart` и
`lineart_long`). Для личного инструмента это дешевле таблицы имён.
- Depends on: решение владельца `D-7`; снятые по
  [`04-source-capture.md`](04-source-capture.md) реальные sources
- Requirement: `PBP-02`

## Scope

Снять доминирующую причину расхождения: `lineart.brush` рисуется формой
`brick()` и зерном `charcoal()`, придуманными в
`src/logic/brush/builtinShapeSources.ts` и `builtinGrainSources.ts`, потому что
настоящие `Brush-Pocket-Brick.png` и `Brush-Artery-Charcoal-Corse.jpg` в
приложении отсутствуют.

Вне scope: математика применения зерна (`PBP-3`) и любая динамика.

## Change map

| Путь | Действие |
| --- | --- |
| `src/app-folders/sources/{shape,grain}/` | реальные sources в git |
| `src/config/brushSourceAssets.ts` | индекс sources по brush id |
| `src/core/brush/brushSourceFolder.ts` | загрузка и decode sources |
| `src/core/brush/procreateBrush.ts` | резолв вместо процедурного fallback |
| `src/contracts/brush.ts` | `shapeSourceState`, `grainSourceState` в отчёте |
| `src/core/brush/brushArchiveSettings.ts` | прокинуть состояния источников |
| `src/logic/brush/builtinShapeSources.ts` | удалить `brick`/`arterySoft`/`haggardOval` |
| `src/logic/brush/builtinGrainSources.ts` | удалить целиком |
| `src/logic/brush/brushCoverage.ts` | убрать `hardness`-экспоненту для image-формы |
| `src/config/bundledBrushes.ts` | убрать угаданный `hardness` из профилей |
| `src/ui/brushes/BrushSourcePanel.ts` | показать состояние источника |
| `src/i18n/raster/{en,ru}BrushSource.ts` | строки состояний |

## Контракты

- `resolveBrushSource(brushId, kind)` ищет файл в библиотеке источников по id
  пресета без учёта регистра и расширения.
  Возвращает `CoverageMap | null`. Библиотека собирается через
  `import.meta.glob`, как бандлы кистей в `bundledBrushes.ts:11`.
- Порядок разрешения формы и зерна строго такой:
  `preset.sources.*` → библиотека источников → ассет внутри архива → `missing`.
  Процедурного шага в цепочке больше нет.
- `CoverageMap` из библиотеки декодируется тем же `decodeCoverage`, что и
  встроенный ассет, и получает `scaleReference = исходная сторона до
  даунсемпла`.
- Состояние источника: `"embedded" | "resolved" | "missing"`. `missing`
  обязателен в `warnings` и означает неполную библиотеку, а не штатный режим.
- Кисть с `missing` формой рисует нейтральным radial safety tip и не роняет
  приложение, но помечена в UI. Это не source и не называется аналогом
  оригинальной формы. `missing` grain означает отсутствие texture, без шума.
- Для image-формы покрытие ассета больше не возводится в степень: `exponent`
  применяется только к радиальному кончику.

## Шаги

1. Проверить уже добавленные sources в `src/app-folders/sources/` и добавить
   индекс, который не требует копирования бинарников.
2. Реализовать `brushSourceFolder.ts` (≤ 150 строк): индекс каталога,
   ленивая загрузка, decode и кеш.
3. Встроить резолв в `procreateBrush.ts` вместо `builtInBrushSource`;
   сохранить порядок из контракта.
4. Расширить `BrushCompatibilityReport` полями состояний и списком
   `missingSourceNames`.
5. Удалить `builtinShapeSources.ts`, `builtinGrainSources.ts` и
   `builtInBrushSource` целиком. Нейтральный radial safety tip остаётся частью
   renderer-а, но не выдаётся за source Procreate.
6. Снять `hardness`-экспоненту с image-формы в `brushCoverage.ts:66` и убрать
   угаданные значения `hardness` из профилей `bundledBrushes.ts`.
7. Показать состояние источника в `BrushSourcePanel` через i18n-строки.

## Edge и failure cases

- Имя из архива не найдено в библиотеке → `missing`, предупреждение, штрих
  нейтральным кончиком; приложение работает.
- Имя есть, но файл битый → `missing`, не `resolved`.
- Форма разрешилась, зерно нет → состояния независимы.
- Ассет крупнее `sourceMaximumSide` → даунсемпл, `scaleReference` хранит
  исходный размер.
- Источник снят с непрозрачным фоном (маршрут C, забыли выключить фон при
  экспорте) → покрытие станет сплошным квадратом. Тест обязан ловить это: доля
  пикселей с нулевой альфой у формы должна быть больше нуля.
- Источник получен разными маршрутами для разных имён — допустимо; способ
  получения каждого файла фиксируется в `brush-sources/README.md`, чтобы при
  расхождении метрик было понятно, где искать потерю точности.

## Persistence и rollback

Пресеты не меняются: резолв происходит на загрузке, в `.prodraw-brush` ничего
не вшивается (решение `D-6`). Откат — `git revert` этапа; procedural
generators не являются допустимым rollback target и не возвращаются.

## i18n и ассеты

Новые ключи `source.state.embedded|resolved|missing` в `enBrushSource.ts` и
`ruBrushSource.ts`. Ассеты — бинарники в git, приватный репозиторий, лицензии
Procreate у владельца. Формат — PNG с альфой, имена совпадают со значениями
`bundledShapePath`/`bundledGrainPath`, включая расширение `.jpg` там, где оно
стоит в архиве (расширение — часть имени, а не формата файла).

## Проверки

```bash
npx vitest run tests/brush-parity tests/brush
```

Плюс `npm run check`, `npx eslint src`, `npm run validate:lines`,
`npm run validate:cycles`, browser smoke на штрихе `lineart`.

## Acceptance criteria

- `lineart.brush` даёт `shapeSourceState: "resolved"`,
  `grainSourceState: "resolved"` и ни одного предупреждения.
- Контрактные тесты доказывают, что `lineart` потребляет library maps, а не
  procedural source; визуальное сравнение выполняет владелец по `D-7`.
- Ни одна кисть из `src/app-folders/brushes/main/` не остаётся в состоянии
  `missing`, либо недостающие имена перечислены поимённо в completion record
  как сознательно отложенные.
- В `src/logic/brush/` не осталось процедурных генераторов формы и зерна,
  кроме радиального кончика.
- Форма из ассета рендерится без экспоненты: покрытие центра совпадает с
  покрытием ассета в пределах 1/255.

## Completion record

- Commit: this stage commit
- Checks: 30 brush files / 66 tests; `npm run check`; production Vite smoke
  showed `Источник из библиотеки` for both Lineart shape and grain with no
  console warnings/errors
- Date: 2026-08-18
