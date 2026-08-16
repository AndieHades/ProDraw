// Экранные координаты → клетка сетки документа. Общий расчёт для системы ввода
// и пипетки, чтобы не дублировать привязку к S.view и прямоугольнику холста.
import { S } from './state.js';
import { $ } from './dom.js';

export function gridAt(clientX, clientY) { const r = $('cv').getBoundingClientRect();
  return [Math.floor((clientX - r.left - S.view.ox) / S.view.zoom), Math.floor((clientY - r.top - S.view.oy) / S.view.zoom)]; }
