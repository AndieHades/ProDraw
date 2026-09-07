// Запросы выделения: попадает ли клетка в активное выделение/маску. Нужны
// рисованию, заливке, эффектам — выносим в core, чтобы не дублировать.
import { S } from "./state.ts";
import { maskHas as queryMaskHas, pointInSelection, selectedPoints,
  selectionHit, selectionIntersectsRect } from "./selection/SelectionGeometry.ts";

type Rect = Parameters<typeof pointInSelection>[0];
type Mask = Parameters<typeof pointInSelection>[1];

export const maskHas = queryMaskHas;
export const inSel = (x: number, y: number): boolean =>
  pointInSelection(S["sel"] as Rect, S["selMask"] as Mask, x, y);
export const inMask = (x: number, y: number): boolean =>
  queryMaskHas(S["selMask"] as Mask, x, y);
export const selHit = (x: number, y: number): boolean =>
  selectionHit(S["sel"] as Rect, S["selMask"] as Mask, x, y);
export { selectedPoints, selectionIntersectsRect };
