import type { SelectionMaskQuery, SelectionPoint,
  SelectionRect } from "../../contracts/selection.ts";

type MaskLike = SelectionMaskQuery & Partial<Iterable<string>>;
const parsePoint = (key: string): SelectionPoint => {
  const separator = key.indexOf(",");
  return [Number(key.slice(0, separator)), Number(key.slice(separator + 1))];
};

export const maskHas = (mask: MaskLike | null | undefined, x: number,
  y: number): boolean => !mask || (mask.hasXY ? mask.hasXY(x, y) : mask.has(`${x},${y}`));

export const pointInSelection = (selection: SelectionRect | null | undefined,
  mask: MaskLike | null | undefined, x: number, y: number): boolean => !selection ||
  (x >= selection.x0 && x <= selection.x1 && y >= selection.y0 &&
    y <= selection.y1 && maskHas(mask, x, y));

export const selectionHit = (selection: SelectionRect | null | undefined,
  mask: MaskLike | null | undefined, x: number, y: number): boolean => !!selection &&
  x >= selection.x0 && x <= selection.x1 && y >= selection.y0 &&
  y <= selection.y1 && maskHas(mask, x, y);

export function *selectedPoints(selection: SelectionRect | null | undefined,
  mask: MaskLike | null | undefined): Generator<SelectionPoint> {
  if (!selection) return;
  if (mask?.points) {
    for (const [x, y] of mask.points()) if (selectionHit(selection, null, x, y))
      yield [x, y];
    return;
  }
  if (mask?.[Symbol.iterator]) {
    for (const key of mask as Iterable<string>) {
      const [x, y] = parsePoint(key);
      if (selectionHit(selection, null, x, y)) yield [x, y];
    }
    return;
  }
  for (let y = selection.y0; y <= selection.y1; y++)
    for (let x = selection.x0; x <= selection.x1; x++) yield [x, y];
}

export function selectionIntersectsRect(selection: SelectionRect | null | undefined,
  mask: MaskLike | null | undefined, rect: SelectionRect): boolean {
  if (!selection) return false;
  const overlap = { x0: Math.max(selection.x0, rect.x0),
    y0: Math.max(selection.y0, rect.y0), x1: Math.min(selection.x1, rect.x1),
    y1: Math.min(selection.y1, rect.y1) };
  if (overlap.x0 > overlap.x1 || overlap.y0 > overlap.y1) return false;
  if (!mask) return true;
  if (mask.intersectsRect) return mask.intersectsRect(overlap);
  for (const [x, y] of selectedPoints(selection, mask))
    if (selectionHit(overlap, null, x, y)) return true;
  return false;
}
