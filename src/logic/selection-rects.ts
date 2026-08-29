import type { SelectionRect } from "../contracts/selection.ts";

export function clipSelectionRect(rect: SelectionRect, width: number,
  height: number): SelectionRect | null {
  const clipped = { x0: Math.max(0, Math.min(rect.x0, rect.x1)),
    y0: Math.max(0, Math.min(rect.y0, rect.y1)),
    x1: Math.min(width - 1, Math.max(rect.x0, rect.x1)),
    y1: Math.min(height - 1, Math.max(rect.y0, rect.y1)) };
  return clipped.x1 < clipped.x0 || clipped.y1 < clipped.y0 ? null : clipped;
}

export const pointInSelectionRect = (rect: SelectionRect, x: number, y: number): boolean =>
  x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;

export function intersectSelectionRects(left: SelectionRect,
  right: SelectionRect): SelectionRect | null {
  const intersection = { x0: Math.max(left.x0, right.x0),
    y0: Math.max(left.y0, right.y0), x1: Math.min(left.x1, right.x1),
    y1: Math.min(left.y1, right.y1) };
  return intersection.x0 <= intersection.x1 && intersection.y0 <= intersection.y1
    ? intersection : null;
}

export function mergeSelectionBounds(left: SelectionRect | null,
  right: SelectionRect | null): SelectionRect | null {
  if (!left) return right ? { ...right } : null;
  if (!right) return { ...left };
  return { x0: Math.min(left.x0, right.x0), y0: Math.min(left.y0, right.y0),
    x1: Math.max(left.x1, right.x1), y1: Math.max(left.y1, right.y1) };
}

type Interval = [number, number];
function mergedIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.sort((left, right) => left[0] - right[0]);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval[0] > previous[1] + 1) merged.push([...interval]);
    else previous[1] = Math.max(previous[1], interval[1]);
  }
  return merged;
}

function complementIntervals(intervals: readonly Interval[], width: number): Interval[] {
  const gaps: Interval[] = []; let cursor = 0;
  for (const [x0, x1] of intervals) {
    if (cursor < x0) gaps.push([cursor, x0 - 1]);
    cursor = Math.max(cursor, x1 + 1);
  }
  if (cursor < width) gaps.push([cursor, width - 1]);
  return gaps;
}

export function partitionSelectionRects(rects: readonly SelectionRect[], width: number,
  height: number, complement = false): SelectionRect[] {
  const clipped = rects.map((rect) => clipSelectionRect(rect, width, height))
    .filter((rect): rect is SelectionRect => rect !== null);
  const breaks = new Set<number>([0, height]);
  for (const rect of clipped) { breaks.add(rect.y0); breaks.add(rect.y1 + 1); }
  const ys = [...breaks].sort((left, right) => left - right);
  const output: SelectionRect[] = [], active = new Map<string, SelectionRect>();
  for (let index = 0; index < ys.length - 1; index++) {
    const y0 = ys[index], nextY = ys[index + 1];
    if (y0 === undefined || nextY === undefined) continue;
    const y1 = nextY - 1;
    const covered = mergedIntervals(clipped
      .filter((rect) => rect.y0 <= y0 && rect.y1 >= y1)
      .map((rect): Interval => [rect.x0, rect.x1]));
    const spans = complement ? complementIntervals(covered, width) : covered;
    const next = new Map<string, SelectionRect>();
    for (const [x0, x1] of spans) {
      const key = `${x0},${x1}`, prior = active.get(key);
      const rect = prior && prior.y1 + 1 === y0 ? prior : { x0, y0, x1, y1 };
      rect.y1 = y1; if (!prior) output.push(rect); next.set(key, rect);
    }
    active.clear(); for (const entry of next) active.set(...entry);
  }
  return output;
}

export function selectionRectUnionArea(rects: readonly SelectionRect[],
  clip: SelectionRect | null = null): number {
  const target = clip ? rects.map((rect) => intersectSelectionRects(rect, clip))
    .filter((rect): rect is SelectionRect => rect !== null) : [...rects];
  const width = clip ? clip.x1 + 1 : Math.max(0, ...target.map((rect) => rect.x1 + 1));
  const height = clip ? clip.y1 + 1 : Math.max(0, ...target.map((rect) => rect.y1 + 1));
  return partitionSelectionRects(target, width, height)
    .reduce((area, rect) => area + (rect.x1 - rect.x0 + 1) *
      (rect.y1 - rect.y0 + 1), 0);
}

export function outsideSelectionStrips(rect: SelectionRect | null, width: number,
  height: number): SelectionRect[] {
  if (!rect) return [{ x0: 0, y0: 0, x1: width - 1, y1: height - 1 }];
  return [{ x0: 0, y0: 0, x1: width - 1, y1: rect.y0 - 1 },
    { x0: 0, y0: rect.y1 + 1, x1: width - 1, y1: height - 1 },
    { x0: 0, y0: rect.y0, x1: rect.x0 - 1, y1: rect.y1 },
    { x0: rect.x1 + 1, y0: rect.y0, x1: width - 1, y1: rect.y1 }]
    .map((value) => clipSelectionRect(value, width, height))
    .filter((value): value is SelectionRect => value !== null);
}
