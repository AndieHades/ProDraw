// Экранные координаты → клетка сетки документа. Общий расчёт для системы ввода
// и пипетки, чтобы не дублировать привязку к S.view и прямоугольнику холста.
import { S } from './state.js';
import { $ } from './dom.js';

export function canvasAt(clientX, clientY) { const r = $('cv').getBoundingClientRect();
  return [(clientX - r.left - S.view.ox) / S.view.zoom,
    (clientY - r.top - S.view.oy) / S.view.zoom]; }
export function gridAt(clientX, clientY) { const [x, y] = canvasAt(clientX, clientY);
  return [Math.floor(x), Math.floor(y)]; }
