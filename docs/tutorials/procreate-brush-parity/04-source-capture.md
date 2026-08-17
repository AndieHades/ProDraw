# 04 — Как получить оригиналы формы и зерна

Нужны девять файлов из `D-1`. Ни один из них не лежит в `.brush`: архив хранит
только имя (`bundledShapePath`, `bundledGrainPath`). Ниже три маршрута,
отсортированные по точности. Идти сверху вниз и останавливаться на первом,
который сработал.

## Маршрут A — заставить Procreate вшить источник в `.brush`

Самый точный и без сторонних инструментов: пиксели приходят ровно те, которыми
рисует Procreate.

### Почему это работает

Procreate хранит источник ссылкой, только пока он библиотечный. Как только
источник становится пользовательским, он вшивается в архив при экспорте.
Доказательство — в самих бандлах:

| Кисть | `bundledShapePath` | Вшито |
| --- | --- | --- |
| `gundersen` | `$null` | `Shape.png` 1.1 МБ, `Grain.png` 2.9 МБ |
| `pencil_waxy` | `$null` | `Shape.png` 185 КБ, `Grain.png` 2.9 МБ |
| `freckles` | `$null` | `Shape.png` 30 КБ, `Grain.png` 395 КБ |
| `net_screentone` | `Brush-Preset-Hard.png` | только `Grain.png` 257 КБ |
| `screentone` | `Brush-Preset-Hard.png` | только `Grain.png` 63 КБ |

Последние две строки — ключевые: форма осталась ссылкой, а зерно вшито.
Значит вшивание происходит **пофайлово** и включается сменой статуса
конкретного источника, а не пересборкой всей кисти. Размеры (2.9 МБ)
показывают, что вшивается полноразмерный оригинал, а не превью.

### Процедура

1. Дублировать кисть (`LINEART` для `Brush-Pocket-Brick.png`). Оригинал не
   трогать.
2. Brush Studio → Shape → Shape Source → **Edit**.
3. Сделать в редакторе изменение, которое меняет пиксели и обратимо:
   поворот на 360°, либо два зеркальных отражения по одной оси. Не
   использовать `Invert` — это отдельный флаг архива (`shapeInverted`), он
   может переключиться без превращения источника в пользовательский.
4. Done → Done. Экспортировать кисть как `.brush`.
5. Проверить результат командой ниже.
6. То же для зерна: Grain → Grain Source → Edit.

### Проверка

```bash
python -c "import zipfile,sys; print('\n'.join(f'{i.filename} {i.file_size}' for i in zipfile.ZipFile(sys.argv[1]).infolist() if not i.filename.startswith('Reset/')))" ПУТЬ_К.brush
```

Появились `Shape.png` и `Grain.png` — маршрут A сработал, дальше можно не
читать. Достаём их обычным распаковщиком и кладём в
`src/app-folders/brush-sources/` под именами из `bundledShapePath` /
`bundledGrainPath`.

### Если поворот не сработал

Другие действия, меняющие пиксели: масштабирование, сдвиг, рисование поверх
источника в редакторе формы. Любое из них должно перевести источник в
пользовательский. Проверять той же командой после каждой попытки.

## Маршрут B — достать из бандла Procreate

Если A не сработал: PNG лежат внутри приложения, которое куплено.

- Ресурсы в `.ipa` **не зашифрованы** — FairPlay покрывает только исполняемый
  Mach-O, картинки читаются напрямую. `.ipa` — обычный zip:
  `Payload/Procreate.app/`.
- Скачать `.ipa` купленного приложения на Windows умеет iMazing; на macOS —
  Apple Configurator.
- Искать по именам из `D-1`. Раз код Procreate обращается к ним строкой
  `"Brush-Pocket-Brick.png"`, это почти наверняка отдельные файлы, а не записи
  в `Assets.car`. Если всё же `Assets.car` — его распаковывает любой
  asset-catalog extractor.

Результат — тот же оригинал, что в маршруте A.

## Маршрут C — снять рендером

Последний вариант, если A и B недоступны. Точность ограничена штамповкой и
антиалиасингом Procreate, но для парити обычно достаточно.

### Форма

1. Дублировать кисть с нужным источником.
2. Обнулить всё, что искажает отпечаток: Stroke Path → Spacing на максимум,
   Jitter и Fall Off в 0; Shape → Scatter 0, Count 1, Count Jitter 0,
   Randomised off, Rotation 0, Azimuth off, Flip X/Y Jitter off; Grain →
   Depth 0; Dynamics → все jitter и speed в 0; Apple Pencil → Size, Opacity,
   Flow в 0; Properties → Maximum size максимум, Max/Min opacity 100 %.
3. Холст 2048×2048, прозрачный фон, чистый чёрный, слайдеры на максимум.
4. Один тап в центре, экспорт PNG без фона.
5. Обрезать по непустой альфе, сохранить как альфа-маску.

Проверка: край отпечатка не обрезан границей холста, максимальная альфа
достигает 255 хотя бы в одном пикселе.

### Зерно

1. Дублировать кисть, форму заменить на `Brush-Preset-Hard`, Scatter 0,
   Count 1.
2. Grain → Depth 100 %, Scale 100 %, Zoom 100 %, Rotation 0, поведение
   `Texturized` (зерно привязано к холсту, а не к дабу), Offset Jitter off,
   Depth Jitter 0, Minimum Depth 0, Brightness и Contrast 0, Filtering off.
3. Stroke Path → Spacing минимальный, Jitter 0; Dynamics и Apple Pencil в 0;
   Rendering → Flow 100 %.
4. Закрасить площадь холста целиком в несколько проходов до насыщения,
   экспорт PNG.
5. Вырезать один период тайла; если период не читается — квадрат 1024×1024.

### Чего маршрут C не сохраняет

- Точную гамму и кривую антиалиасинга при штамповке. Расхождение мелкое и
  системное, калибруется метриками `PBP-1`, а не подгонкой снимка.
- Исходное разрешение: `decodeCoverage` всё равно ужимает форму до
  `sourceMaximumSide = 512`.

## Общее для всех маршрутов

- Имена файлов в `src/app-folders/brush-sources/` совпадают со значениями
  `bundledShapePath` / `bundledGrainPath` **вместе с расширением**: там, где в
  архиве стоит `.jpg`, имя остаётся с `.jpg`, даже если содержимое PNG.
  Расширение — часть ключа поиска, а не формата.
- Цвет отбрасывается: все источники одноканальные
  (`coveragePixels` в `decodeCoverage.ts:11`).
- `Brush-Preset-Blank.png` снимать не нужно — нейтральное зерно обрабатывается
  отдельной веткой (`blankGrain` в `brushCoverage.ts:62`). Достаточно сплошной
  белой карты 8×8.

## Порядок и приоритет

| Имя | Кисти | Тип |
| --- | --- | --- |
| `Brush-Pocket-Brick.png` | `lineart`, `lineart_long` | shape |
| `Brush-Artery-Charcoal-Corse.jpg` | `lineart`, `lineart_long`, `shadow` | grain |
| `Brush-Preset-Hard.png` | `base_color`, `net_screentone`, `screentone`, `shadow` | shape |
| `Brush-Preset-Soft.png` | `big_soft_brush` | shape |
| `Brush-Artery-Ultra-Soft.jpg` | `sketching` | shape |
| `Cotton-Paper.jpg` | `sketching` | grain |
| `Haggard-Oval.png` | `texture` | shape |
| `Brush-Artery-Charcoal-Vine.jpg` | `texture` | grain |
| `Brush-Preset-Blank.png` | `base_color`, `big_soft_brush` | grain (нейтраль) |

Для разбора `lineart.brush` достаточно первых двух строк. Остальные снимаются
по мере надобности — неснятые имена видны как `missing` в Brush Studio.
