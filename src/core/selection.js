// Запросы выделения: попадает ли клетка в активное выделение/маску. Нужны
// рисованию, заливке, эффектам — выносим в core, чтобы не дублировать.
import { S } from './state.js';
import { maskHas as queryMaskHas, pointInSelection, selectedPoints,
  selectionHit, selectionIntersectsRect } from './selection/SelectionGeometry.ts';

export const maskHas = queryMaskHas;
export const inSel = (x, y) => pointInSelection(S.sel, S.selMask, x, y);
export const inMask = (x, y) => queryMaskHas(S.selMask, x, y);
export const selHit = (x, y) => selectionHit(S.sel, S.selMask, x, y);
export { selectedPoints, selectionIntersectsRect };
