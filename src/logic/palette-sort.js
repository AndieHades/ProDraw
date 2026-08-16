// Сортировка палитры в связный вид: цвета группируются по тону (зелёные,
// коричневые/оранжевые, синие… не смешиваются в кучу), внутри тона идут от
// светлого (тинт) к тёмному (тень). Нейтральные (низкая насыщенность — серый/
// чёрный/белый) собираются отдельной группой по светлоте в начало. Чистая
// функция: [r,g,b][] → новый отсортированный массив тех же ссылок.
import { rgbToHsv } from './color.js';

const HUE_STEP = 30;   // ширина корзины тона, ° → 12 семейств (красный…пурпурный)
const GRAY_SAT = 12;   // насыщенность ниже — цвет нейтральный, тон не осмыслен
const HUE_ORDER = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8]; // Apollo-like: blue → green → warm → red → violet
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const hueBin = (h) => Math.round(h / HUE_STEP) % (360 / HUE_STEP); // 359° → корзина красного
const hueRank = (h) => HUE_ORDER.indexOf(hueBin(h));

export function sortPalette(colors) {
  const items = colors.map((c) => { const [h, s] = rgbToHsv(c[0], c[1], c[2]); return { c, h, s }; });
  const gray = items.filter((it) => it.s < GRAY_SAT).sort((a, b) => lum(a.c) - lum(b.c));
  const chroma = items.filter((it) => it.s >= GRAY_SAT)
    .sort((a, b) => hueRank(a.h) - hueRank(b.h) || lum(a.c) - lum(b.c));
  return [...chroma, ...gray].map((it) => it.c);
}
