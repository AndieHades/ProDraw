# Конфигурация (`src/config/`)

Цель: всё настраиваемое — **данные в одном очевидном месте**, а не магические
числа по коду. Поменять поведение/пресет/дефолт = править `config`, не системы.

## Файлы

| Файл | Что настраивает |
|------|-----------------|
| `config/limits.js` | пределы: `MAX_LAYERS`, `MAX_SIZE`, `BP_SMAX`, `ZOOM_MIN/MAX`, `historyCap(area)` |
| `config/presets.js` | `SIZE_PRESETS` (плитки «Новый документ»), `DEFAULT_DOC` |
| `config/palette.js` | `DEFAULT_PALETTE_HEX`, `DEFAULT_ACTIVE`, `defaultPalette()` |
| `config/defaults.js` | дефолты кисти/ластика, эффектов (обводка/тень/свечение/коррекция), импорта, флаги pp/стабилизации |
| `config/timings.js` | тайминги и пороги жестов (долгий тап, удержание, drag-порог, сглаживание, щипок, тост) |
| `config/layer-actions.js` | `LAYER_SWIPE_ACTIONS` — кнопки строки слоя при свайпе влево (lock/alphaLock/clip/duplicate/delete) |
| `config/lasso.js` | Freehand Selection: `LASSO_DEFAULT` (режим/операция), `LASSO_CLOSE_PX` (порог замыкания), `LASSO_MIN_POINTS` |
| `config/brush-resize.js` | Brush Size Modifier: `BRUSH_RESIZE` (Hot Key/чувствительность/направление), `SENS_PRESETS`, `DIRECTIONS` |
| `config/eyedropper.js` | Пипетка: `EYEDROPPER.key` — Hot Key по умолчанию (Alt), переназначается в настройках |
| `config/quickshape.js` | QuickShape: `QUICKSHAPE.holdMs` — задержка удержания до выравнивания формы |
| `config/text.js` | Text Tool: встроенные шрифты, дефолт текста, ограничения файлов импорта |

Хоткеи — тоже данные, но живут со своей системой: `systems/keyboard/keymap.js`
(см. [keymap.md](keymap.md)). Строки UI — в локалях ([i18n.md](i18n.md)),
значения стиля — в токенах ([theming.md](theming.md)).

## Правило

- **Никаких магических чисел/значений в системах**, если это что-то
  настраиваемое (предел, пресет, дефолт, тайминг). Импортируй из `config`.
- `state.js` берёт стартовые значения документа из `config` (размер, палитра,
  кисти) — не дублируй их.
- Добавляешь настраиваемое — клади в подходящий файл `config` и ссылайся.

## Примеры

```js
import { MAX_LAYERS } from '../config/limits.js';
import { SIZE_PRESETS } from '../config/presets.js';
import { LONG_PRESS_MS } from '../config/timings.js';
import { GLOW_DEFAULT } from '../config/defaults.js';
```

Добавить пресет размера — одна строка в `SIZE_PRESETS`. Изменить глубину
истории — `historyCap`. Сменить дефолтную палитру — `DEFAULT_PALETTE_HEX`.
