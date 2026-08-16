# Конфигурация

Настраиваемые пределы, presets, timings, brush defaults и hotkeys являются
данными в `src/config`, а не literals внутри systems.

## Обязательные canvas presets

- game: 1920×1080, 1920×1200, 2560×1440, 2560×1600, 3840×2160;
- print 300 DPI: A5 1748×2480 и A4 2480×3508, portrait/landscape;
- social: 1080×1080, 1080×1350, 1080×1920;
- art: 2048×2048, 4096×4096;
- custom: до 8192 px по стороне и 50 млн пикселей согласно
  `src/config/raster.ts`.

Physical presets хранят DPI и исходный размер, но painting coordinates остаются
pixel-based. Поворот A-series меняет ориентацию, не пересчитывает размеры.

Канонические данные находятся в `src/config/canvasPresets.ts` и
`src/config/raster.ts`. Старые `.js`-конфиги относятся только к неисполняемому
legacy oracle; ограничения 32×32/640 px не входят в production runtime.
