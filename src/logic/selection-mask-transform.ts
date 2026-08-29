import type { SelectionPoint, SelectionRect } from "../contracts/selection.ts";
import { cellsSelectionMask, isSelectionMask, SelectionMask } from "./selection-mask.ts";
import type { SymmetryConfig } from "../contracts/Symmetry.ts";

const clipRect = (rect: SelectionRect, width: number, height: number): SelectionRect |
  null => {
  const output = { x0: Math.max(0, rect.x0), y0: Math.max(0, rect.y0),
    x1: Math.min(width - 1, rect.x1), y1: Math.min(height - 1, rect.y1) };
  return output.x0 <= output.x1 && output.y0 <= output.y1 ? output : null;
};
const translated = (rect: SelectionRect, dx: number, dy: number, width: number,
  height: number): SelectionRect | null => clipRect({ x0: rect.x0 + dx,
  y0: rect.y0 + dy, x1: rect.x1 + dx, y1: rect.y1 + dy }, width, height);
const outsideStrips = (rect: SelectionRect, width: number,
  height: number): SelectionRect[] => [
  { x0: 0, y0: 0, x1: width - 1, y1: rect.y0 - 1 },
  { x0: 0, y0: rect.y1 + 1, x1: width - 1, y1: height - 1 },
  { x0: 0, y0: rect.y0, x1: rect.x0 - 1, y1: rect.y1 },
  { x0: rect.x1 + 1, y0: rect.y0, x1: width - 1, y1: rect.y1 }
].map((value) => clipRect(value, width, height))
  .filter((value): value is SelectionRect => value !== null);

export function cloneSelectionMask(mask: unknown, _selection: unknown, width: number,
  height: number): SelectionMask | null {
  if (!mask) return null;
  return isSelectionMask(mask) ? mask.clone() :
    cellsSelectionMask(mask as Iterable<string | SelectionPoint>, width, height);
}
export function shiftSelectionMask(mask: unknown, dx: number, dy: number, width: number,
  height: number): SelectionMask | null {
  if (!mask) return null;
  const source = isSelectionMask(mask) ? mask :
    cellsSelectionMask(mask as Iterable<string | SelectionPoint>, width, height);
  let rects = source.rects.map((rect) => translated(rect, dx, dy, width, height))
    .filter((rect): rect is SelectionRect => rect !== null);
  if (source.complement && (dx || dy)) {
    const domain = clipRect({ x0: dx, y0: dy, x1: width - 1 + dx,
      y1: height - 1 + dy }, width, height);
    rects = rects.concat(domain ? outsideStrips(domain, width, height) :
      [{ x0: 0, y0: 0, x1: width - 1, y1: height - 1 }]);
  }
  const output = new SelectionMask(width, height, rects, source.complement);
  source.include.forEachPoint((x, y) => output.forceSelected(x + dx, y + dy));
  source.exclude.forEachPoint((x, y) => output.forceUnselected(x + dx, y + dy));
  return output;
}

const scaledRange = (start: number, end: number, origin: number, oldSize: number,
  nextOrigin: number, nextSize: number): readonly [number, number] | null => {
  const low = Math.max(0, start - origin), high = Math.min(oldSize - 1, end - origin);
  return low > high ? null : [nextOrigin + Math.ceil(low * nextSize / oldSize),
    nextOrigin + Math.ceil((high + 1) * nextSize / oldSize) - 1];
};
function scaledRect(rect: SelectionRect, from: SelectionRect,
  to: SelectionRect): SelectionRect | null {
  const x = scaledRange(rect.x0, rect.x1, from.x0, from.x1 - from.x0 + 1,
    to.x0, to.x1 - to.x0 + 1);
  const y = scaledRange(rect.y0, rect.y1, from.y0, from.y1 - from.y0 + 1,
    to.y0, to.y1 - to.y0 + 1);
  return x && y ? { x0: x[0], y0: y[0], x1: x[1], y1: y[1] } : null;
}
function mapPointRange(x: number, y: number, from: SelectionRect, to: SelectionRect,
  visit: (x: number, y: number) => void): void {
  const xRange = scaledRange(x, x, from.x0, from.x1 - from.x0 + 1,
    to.x0, to.x1 - to.x0 + 1);
  const yRange = scaledRange(y, y, from.y0, from.y1 - from.y0 + 1,
    to.y0, to.y1 - to.y0 + 1);
  if (!xRange || !yRange) return;
  for (let yy = yRange[0]; yy <= yRange[1]; yy++)
    for (let xx = xRange[0]; xx <= xRange[1]; xx++) visit(xx, yy);
}
export function resizeSelectionMask(mask: unknown, from: SelectionRect,
  to: SelectionRect, width: number, height: number): SelectionMask | null {
  if (!mask) return null;
  const source = isSelectionMask(mask) ? mask :
    cellsSelectionMask(mask as Iterable<string | SelectionPoint>, width, height);
  const mapped = source.rects.map((rect) => scaledRect(rect, from, to))
    .filter((rect): rect is SelectionRect => rect !== null);
  const rects = source.complement ? mapped.concat(outsideStrips(to, width, height)) : mapped;
  const output = new SelectionMask(width, height, rects, source.complement);
  source.include.forEachPoint((x, y) => mapPointRange(x, y, from, to,
    (nextX, nextY) => output.forceSelected(nextX, nextY)));
  source.exclude.forEachPoint((x, y) => mapPointRange(x, y, from, to,
    (nextX, nextY) => output.forceUnselected(nextX, nextY)));
  return output;
}

type Reflection = (point: SelectionPoint) => SelectionPoint;
const reflectionFunctions = (config: SymmetryConfig): Reflection[] => {
  const output: Reflection[] = [];
  if (config.x) output.push(([x, y]) => [Math.round(2 * config.axisX - x), y]);
  if (config.y) output.push(([x, y]) => [x, Math.round(2 * config.axisY - y)]);
  if (config.d1) output.push(([x, y]) =>
    [Math.round(y - config.diagP), Math.round(x + config.diagP)]);
  if (config.d2) output.push(([x, y]) =>
    [Math.round(config.diagN - y), Math.round(config.diagN - x)]);
  return output;
};
function reflectedRect(rect: SelectionRect, reflect: Reflection, width: number,
  height: number): SelectionRect | null {
  const points = [reflect([rect.x0, rect.y0]), reflect([rect.x1, rect.y0]),
    reflect([rect.x0, rect.y1]), reflect([rect.x1, rect.y1])];
  const x = points.map((point) => point[0]), y = points.map((point) => point[1]);
  return clipRect({ x0: Math.min(...x), y0: Math.min(...y), x1: Math.max(...x),
    y1: Math.max(...y) }, width, height);
}
export function symmetrizeSimpleSelectionMask(mask: unknown,
  config: SymmetryConfig): SelectionMask | null {
  if (!isSelectionMask(mask) || mask.complement || mask.include.size ||
    mask.exclude.size) return null;
  const reflections = reflectionFunctions(config), queue = [...mask.rects];
  const rects: SelectionRect[] = [], seen = new Set<string>();
  for (let index = 0; index < queue.length && index < 64; index++) {
    const rect = queue[index]; if (!rect) continue;
    const key = `${rect.x0},${rect.y0},${rect.x1},${rect.y1}`;
    if (seen.has(key)) continue; seen.add(key); rects.push(rect);
    for (const reflect of reflections) {
      const next = reflectedRect(rect, reflect, mask.width, mask.height);
      const nextKey = next && `${next.x0},${next.y0},${next.x1},${next.y1}`;
      if (next && nextKey && !seen.has(nextKey)) queue.push(next);
    }
  }
  return new SelectionMask(mask.width, mask.height, rects);
}
