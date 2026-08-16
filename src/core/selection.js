// Запросы выделения: попадает ли клетка в активное выделение/маску. Нужны
// рисованию, заливке, эффектам — выносим в core, чтобы не дублировать.
import { S } from './state.js';

export const inSel = (x, y) => !S.sel || (x >= S.sel.x0 && x <= S.sel.x1 && y >= S.sel.y0 && y <= S.sel.y1 && (!S.selMask || S.selMask.has(x + ',' + y)));
export const inMask = (x, y) => !S.selMask || S.selMask.has(x + ',' + y);
export const selHit = (x, y) => !!S.sel && x >= S.sel.x0 && x <= S.sel.x1 && y >= S.sel.y0 && y <= S.sel.y1 && (!S.selMask || S.selMask.has(x + ',' + y));
