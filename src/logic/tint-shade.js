// Чистая генерация шкал тинтов/шейдов и цветовых гармоний — без DOM и без state.
// Тинт подмешивает белый, шейд — чёрный; каждая шкала = база + 4 шага = 5 цветов.
import { rgbToHsv, hsvToRgb } from './color.js';
import { TINT_SHADE_STEPS, HARMONY_OFFSETS } from '../config/tint-shade.js';

const tintCh = (c, a) => Math.round(c + (255 - c) * a);
const shadeCh = (c, a) => Math.round(c * (1 - a));
const apply = (base, fn, a) => [fn(base[0], a), fn(base[1], a), fn(base[2], a)];
const scale = (base, fn) => [base.slice(0, 3), ...TINT_SHADE_STEPS.map((a) => apply(base, fn, a))];

export const generateTints = (base) => scale(base, tintCh);
export const generateShades = (base) => scale(base, shadeCh);

// Дополнительные базовые цвета гармонии: тон вращается, насыщенность/яркость сохраняются.
export function generateHarmonyBaseColors(base, type) {
  const [h, s, v] = rgbToHsv(base[0], base[1], base[2]);
  return (HARMONY_OFFSETS[type] || []).map((d) => hsvToRgb(h + d, s, v));
}

// Для каждого базового цвета гармонии — те же 5-цветные шкалы тинтов и шейдов.
export function generateTintShadeScalesForHarmony(base, type) {
  return generateHarmonyBaseColors(base, type).map((c) => ({
    base: c, tints: generateTints(c), shades: generateShades(c),
  }));
}
