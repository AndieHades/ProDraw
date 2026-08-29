import type { TransformCell, TransformFrame, TransformPoint, TransformResult,
  TransformSnapshot, TransformSource, TransformSourceBounds,
  TransformState } from "./TransformTypes.ts";

export const rotCenter = (mode: TransformState): TransformPoint => ({
  x: mode.b.x0 + mode.b.w / 2 + mode.tx,
  y: mode.b.y0 + mode.b.h / 2 + mode.ty
});

export function rotLocalToWorld(mode: TransformState, localX: number,
  localY: number): TransformPoint {
  const center = rotCenter(mode), cosine = Math.cos(mode.ang), sine = Math.sin(mode.ang);
  const x = (localX - mode.b.w / 2) * mode.sx;
  const y = (localY - mode.b.h / 2) * mode.sy;
  return { x: center.x + x * cosine - y * sine,
    y: center.y + x * sine + y * cosine };
}

export function rotWorldToLocal(mode: TransformState, x: number,
  y: number): TransformPoint {
  const center = rotCenter(mode), cosine = Math.cos(mode.ang), sine = Math.sin(mode.ang);
  const dx = x - center.x, dy = y - center.y;
  return { x: (dx * cosine + dy * sine) / mode.sx + mode.b.w / 2,
    y: (-dx * sine + dy * cosine) / mode.sy + mode.b.h / 2 };
}

export const rotState = (mode: TransformState): TransformSnapshot => ({
  ang: mode.ang, sx: mode.sx, sy: mode.sy, tx: mode.tx, ty: mode.ty
});
export const rotHasChanges = (mode: TransformState): boolean =>
  Math.abs(mode.ang) > 1e-4 || Math.abs(mode.sx - 1) > 1e-4 ||
  Math.abs(mode.sy - 1) > 1e-4 || Math.abs(mode.tx) > 1e-4 || Math.abs(mode.ty) > 1e-4;
export function rotRestoreState(mode: TransformState, state: TransformSnapshot): void {
  mode.ang = state.ang; mode.sx = state.sx; mode.sy = state.sy;
  mode.tx = state.tx; mode.ty = state.ty; mode.changed = rotHasChanges(mode);
}

export function rotFrame(mode: TransformState): TransformFrame {
  const points = [rotLocalToWorld(mode, 0, 0), rotLocalToWorld(mode, mode.b.w, 0),
    rotLocalToWorld(mode, mode.b.w, mode.b.h), rotLocalToWorld(mode, 0, mode.b.h)];
  const [a, b, c, d] = points;
  if (!a || !b || !c || !d) return { p: points };
  return { p: points, sides: [
    { kind: "scale-y", sign: -1, p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } },
    { kind: "scale-x", sign: 1, p: { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 } },
    { kind: "scale-y", sign: 1, p: { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 } },
    { kind: "scale-x", sign: -1, p: { x: (d.x + a.x) / 2, y: (d.y + a.y) / 2 } }
  ] };
}

function sourceFrame(mode: TransformState,
  bounds: TransformSourceBounds | null): TransformFrame {
  if (!bounds) return rotFrame(mode);
  const x1 = bounds.maxx + 1, y1 = bounds.maxy + 1;
  return { p: [rotLocalToWorld(mode, bounds.minx, bounds.miny),
    rotLocalToWorld(mode, x1, bounds.miny), rotLocalToWorld(mode, x1, y1),
    rotLocalToWorld(mode, bounds.minx, y1)] };
}

export function rotBuildCells(mode: TransformState, source: TransformSource,
  sourceBounds: TransformSourceBounds | null = null): TransformResult | null {
  const frame = sourceFrame(mode, sourceBounds);
  const xs = frame.p.map((point) => point.x), ys = frame.p.map((point) => point.y);
  const x0 = Math.floor(Math.min(...xs)) - 1, x1 = Math.ceil(Math.max(...xs)) + 1;
  const y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1;
  const cells: [number, number, TransformCell][] = [];
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const point = rotWorldToLocal(mode, x + 0.5, y + 0.5);
    const sourceX = Math.floor(point.x), sourceY = Math.floor(point.y);
    if (sourceX < 0 || sourceY < 0 || sourceX >= mode.b.w || sourceY >= mode.b.h)
      continue;
    const cell = source[sourceY]?.[sourceX]; if (!cell) continue;
    cells.push([x, y, cell]); minx = Math.min(minx, x); miny = Math.min(miny, y);
    maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
  }
  return cells.length ? { cells, minx, miny, maxx, maxy } : null;
}

export function rotBuildCellsSym(mode: TransformState, source: TransformSource,
  width: number, height: number,
  sourceBounds: TransformSourceBounds | null = null): TransformResult | null {
  const result = rotBuildCells(mode, source, sourceBounds);
  const mirrorX = mode.sym?.sx, mirrorY = mode.sym?.sy;
  if (!result || (!mirrorX && !mirrorY)) return result;
  const seen = new Set<string>(), cells: [number, number, TransformCell][] = [];
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const put = (x: number, y: number, cell: TransformCell): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const key = `${x},${y}`; if (seen.has(key)) return; seen.add(key);
    cells.push([x, y, cell]); minx = Math.min(minx, x); miny = Math.min(miny, y);
    maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
  };
  for (const [x, y, cell] of result.cells) { put(x, y, cell);
    if (mirrorX) put(width - 1 - x, y, cell);
    if (mirrorY) put(x, height - 1 - y, cell);
    if (mirrorX && mirrorY) put(width - 1 - x, height - 1 - y, cell); }
  return cells.length ? { cells, minx, miny, maxx, maxy } : null;
}
