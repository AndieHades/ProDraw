// Запросы выделения: попадает ли клетка в активное выделение/маску. Нужны
// рисованию, заливке, эффектам — выносим в core, чтобы не дублировать.
import { S } from './state.js';
import { parseKey } from '../logic/raster.js';

export const maskHas = (mask, x, y) => !mask ||
  (mask.hasXY ? mask.hasXY(x, y) : mask.has(x + ',' + y));
export const inSel = (x, y) => !S.sel ||
  (x >= S.sel.x0 && x <= S.sel.x1 && y >= S.sel.y0 && y <= S.sel.y1 &&
    maskHas(S.selMask, x, y));
export const inMask = (x, y) => maskHas(S.selMask, x, y);
export const selHit = (x, y) => !!S.sel &&
  x >= S.sel.x0 && x <= S.sel.x1 && y >= S.sel.y0 && y <= S.sel.y1 &&
  maskHas(S.selMask, x, y);

export function *selectedPoints(sel, mask) {
  if (!sel) return;
  if (mask?.points) {
    for (const [x, y] of mask.points()) {
      if (x >= sel.x0 && x <= sel.x1 && y >= sel.y0 && y <= sel.y1) yield [x, y];
    }
    return;
  }
  if (mask) {
    for (const key of mask) {
      const [x, y] = parseKey(key);
      if (x >= sel.x0 && x <= sel.x1 && y >= sel.y0 && y <= sel.y1) yield [x, y];
    }
    return;
  }
  for (let y = sel.y0; y <= sel.y1; y++) {
    for (let x = sel.x0; x <= sel.x1; x++) yield [x, y];
  }
}

export function selectionIntersectsRect(sel, mask, rect) {
  if (!sel) return false;
  const overlap = {
    x0: Math.max(sel.x0, rect.x0),
    y0: Math.max(sel.y0, rect.y0),
    x1: Math.min(sel.x1, rect.x1),
    y1: Math.min(sel.y1, rect.y1),
  };
  if (overlap.x0 > overlap.x1 || overlap.y0 > overlap.y1) return false;
  if (!mask) return true;
  if (mask.intersectsRect) return mask.intersectsRect(overlap);
  for (const [x, y] of selectedPoints(sel, mask)) {
    if (x >= overlap.x0 && x <= overlap.x1 && y >= overlap.y0 && y <= overlap.y1) return true;
  }
  return false;
}
