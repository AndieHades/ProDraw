// Импорт кистей: настройки растеризации кончика в пиксельную маску.
// Меняешь поведение порога/обрезки — здесь, а не магическими числами в коде.
export const BRUSH_MASK = { threshold: 0.5, floor: 8, invert: false }; // покрытие→клетка
export const BRUSH_SRC_MAX = 256; // потолок стороны исходного кончика при декоде, px
export const BRUSH_GRAIN_DECODE_MAX = 2048; // декод grain в натив (точные пиксели для поиска периода дизера)
export const BRUSH_SCATTER = { jitterScale: 1 }; // множитель радиуса разброса (plotJitter × размер)
export const BRUSH_SETTINGS = { spacingMax: 4, jitterMax: 6 }; // пределы ползунков настроек кисти в панели
