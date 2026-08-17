// Импорт кистей: настройки растеризации кончика в пиксельную маску.
// Меняешь поведение порога/обрезки — здесь, а не магическими числами в коде.
import raster from './brush-raster.json' with { type: 'json' };

export const BRUSH_MASK = { threshold: 0.5, floor: 8, invert: false }; // покрытие→клетка
export const BRUSH_SRC_MAX = raster.sourceMaximumSide;
export const BRUSH_GRAIN_DECODE_MAX = raster.grainDecodeMaximumSide;
export const BRUSH_GRAIN_SCALE_DIVISOR = raster.grainScaleDivisor;
export const BRUSH_DAB_SPACING = Object.freeze({ ...raster.dabSpacing });
export const BRUSH_SCATTER = { jitterScale: 1 }; // множитель радиуса разброса (plotJitter × размер)
export const BRUSH_SETTINGS = { spacingMax: 4, jitterMax: 6 }; // пределы ползунков настроек кисти в панели
