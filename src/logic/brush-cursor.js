// Чистая логика курсора-кисти: маска отпечатка, который положит СЛЕДУЮЩИЙ
// штамп. Для импортированной кисти — её маска в натуральном размере, иначе
// квадрат size×size (как и рисует движок в systems/draw/brush.js).
// Переиспользует ядро brush-stamp — без дублирования алгоритма маски/grain.
// Без DOM и state.
import { brushFootprint, stampSize } from './brush-stamp.js';

// sb — запись кисти-штампа (S.stampBrush[tool]) или null (квадратная кисть).
// slider — размер кисти из ползунка, smax — потолок (BP_SMAX).
// Возвращает { w, h, data:Uint8Array(0/1) } или null (пустая кисть).
export function footprintMask(sb, slider, smax, cx = 0, cy = 0) {
  if (sb) return brushFootprint(sb, stampSize(sb, slider, smax), cx, cy);
  const n = Math.max(1, slider | 0);
  return { w: n, h: n, data: new Uint8Array(n * n).fill(1) };
}

// Поворот отпечатка (радианы), если кисть его задаёт; иначе 0. Деталь
// держим тут, чтобы рендер не лез в структуру параметров кисти.
export function footprintRotation(sb) {
  const r = sb && sb.params && sb.params.rotation;
  return typeof r === 'number' ? r : 0;
}
