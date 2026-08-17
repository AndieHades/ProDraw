# Конфигурация

Настраиваемые пределы, presets, timings, brush defaults и hotkeys являются
данными в `src/config`, а не literals внутри systems.

## Обязательные canvas presets

- game: 1920×1080, 1920×1200, 2560×1440, 2560×1600, 3840×2160;
- print 300 DPI: A5 1748×2480 и A4 2480×3508, portrait/landscape;
- social: Instagram 1:1 1080×1080, Instagram 3:4 1080×1440, Reels/Stories 1080×1920;
- art: 2048×2048, 4096×4096;
- custom: текущий восстановленный shell ограничен 4096 px по стороне
  через `src/config/limits.js`; целевой tiled runtime допускает 8192 px
  и 50 млн пикселей через `src/config/raster.ts` после cutover.

Physical presets хранят DPI и исходный размер, но painting coordinates остаются
pixel-based. Поворот A-series меняет ориентацию, не пересчитывает размеры.

Новый пользовательский холст всегда начинает с видимого белого Background.
Прозрачность получается отключением Background; импорт и повторное открытие не
перезаписывают сохранённый фон.

Канонический каталог лежит в `src/config/canvas-presets.json`:
`canvasPresets.ts` читает его для target runtime, а `presets.js` адаптирует для
текущего production shell. Размеры и переводимые `labelKey` не
дублируются.

Массовые pixel-команды хранят sparse undo до
`PIXEL_BATCH_SPARSE_LIMIT`; после порога история переключается на
одну обратимую raster-ссылку, не на миллионы `Map` entries.

Ритм границы выделения задаёт `src/config/selection-ants.js`. Пунктир
измеряется в экранных, а не document pixels: крупные штрихи и промежутки не
уплотняются при изменении масштаба холста. Там же находятся скорость анимации
и толщина линии.

Точность и защитные пределы raster-кистей задаёт
`src/config/brush-raster.json`: нативный размер Shape/Grain, перевод масштаба
Grain, минимальный интервал dab и предел только presentation-cache. Эти
пределы не уменьшают authored Shape/Grain, которыми рисуется финальный штрих.

Извлечение палитры с холста использует пределы
`src/config/palette-sampling.js`. Команда берёт актуальный committed composite,
уменьшает его до `PALETTE_SAMPLE_MAX_SIDE` и только затем читает ImageData и
квантует цвет. Лимит влияет на анализ палитры, но не меняет пиксели документа.
