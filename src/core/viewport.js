// Экранные координаты → клетка сетки документа. Общий расчёт для системы ввода
// и пипетки, чтобы не дублировать привязку к S.view и прямоугольнику холста.
import { S } from './state.js';
import { clientToCanvas } from '../logic/view/LegacyViewGeometry.ts';

// Во время жеста холст не двигается, поэтому его прямоугольник измеряется один
// раз: раньше каждое событие указателя форсировало layout. Вне жеста кеш не
// держится, чтобы перемещение панелей не смещало курсор.
let held = null, holding = false;

export function canvasBounds() {
  if (holding && held) return held;
  const rect = document.getElementById('cv').getBoundingClientRect();
  if (holding) held = rect;
  return rect;
}

export function holdCanvasBounds() { holding = true; held = null; }
export function releaseCanvasBounds() { holding = false; held = null; }

export function canvasAt(clientX, clientY) {
  const point = clientToCanvas(clientX, clientY, canvasBounds(), S.view);
  return [point.x, point.y];
}
export function gridAt(clientX, clientY) { const [x, y] = canvasAt(clientX, clientY);
  return [Math.floor(x), Math.floor(y)]; }
