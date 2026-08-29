// Экранные координаты → клетка сетки документа. Общий расчёт для системы ввода
// и пипетки, чтобы не дублировать привязку к S.view и прямоугольнику холста.
import { S } from './state.js';
import { clientToCanvas } from '../logic/view/LegacyViewGeometry.ts';

export function canvasAt(clientX, clientY) { const r = document.getElementById('cv').getBoundingClientRect();
  const point = clientToCanvas(clientX, clientY, r, S.view);
  return [point.x, point.y]; }
export function gridAt(clientX, clientY) { const [x, y] = canvasAt(clientX, clientY);
  return [Math.floor(x), Math.floor(y)]; }
