export type RasterPoint = readonly [number, number];
export type RasterVisit = (x: number, y: number) => void;

export function bres(x0: number, y0: number, x1: number, y1: number,
  visit: RasterVisit): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let error = dx + dy;
  for (;;) {
    visit(x0, y0); if (x0 === x1 && y0 === y1) break;
    const doubled = 2 * error;
    if (doubled >= dy) { error += dy; x0 += sx; }
    if (doubled <= dx) { error += dx; y0 += sy; }
  }
}
export function rectEdges(x0: number, y0: number, x1: number, y1: number,
  visit: RasterVisit): void {
  const left = Math.min(x0, x1), right = Math.max(x0, x1);
  const top = Math.min(y0, y1), bottom = Math.max(y0, y1);
  for (let x = left; x <= right; x++) {
    visit(x, top); if (bottom !== top) visit(x, bottom);
  }
  for (let y = top + 1; y < bottom; y++) {
    visit(left, y); if (right !== left) visit(right, y);
  }
}
export function rectFill(x0: number, y0: number, x1: number, y1: number,
  visit: RasterVisit): void {
  const left = Math.min(x0, x1), right = Math.max(x0, x1);
  const top = Math.min(y0, y1), bottom = Math.max(y0, y1);
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) visit(x, y);
}
export function ellipseEdges(x0: number, y0: number, x1: number, y1: number,
  visit: RasterVisit): void {
  let a = Math.abs(x1 - x0); const b = Math.abs(y1 - y0), odd = b & 1;
  let dx = 4 * (1 - a) * b * b, dy = 4 * (odd + 1) * a * a;
  let error = dx + dy + odd * a * a;
  if (x0 > x1) { x0 = x1; x1 += a; }
  if (y0 > y1) y0 = y1;
  y0 += (b + 1) >> 1; y1 = y0 - odd; a = 8 * a * a;
  const squaredB = 8 * b * b;
  do {
    visit(x1, y0); visit(x0, y0); visit(x0, y1); visit(x1, y1);
    const doubled = 2 * error;
    if (doubled <= dy) { y0++; y1--; error += dy += a; }
    if (doubled >= dx || 2 * error > dy) { x0++; x1--; error += dx += squaredB; }
  } while (x0 <= x1);
  while (y0 - y1 < b) {
    visit(x0 - 1, y0); visit(x1 + 1, y0++);
    visit(x0 - 1, y1); visit(x1 + 1, y1--);
  }
}
export function ellipseFill(x0: number, y0: number, x1: number, y1: number,
  visit: RasterVisit): void {
  const rows = new Map<number, [number, number]>();
  ellipseEdges(x0, y0, x1, y1, (x, y) => {
    const row = rows.get(y);
    if (!row) rows.set(y, [x, x]);
    else { if (x < row[0]) row[0] = x; if (x > row[1]) row[1] = x; }
  });
  for (const [y, row] of rows)
    for (let x = row[0]; x <= row[1]; x++) visit(x, y);
}

const key = (x: number, y: number): string => `${x},${y}`;
export const parseRasterPoint = (value: string): RasterPoint => {
  const separator = value.indexOf(",");
  return [Number(value.slice(0, separator)), Number(value.slice(separator + 1))];
};
export function closedContourMask(points: readonly RasterPoint[], width: number,
  height: number, strokeSegment: (output: Set<string>, a: RasterPoint,
    b: RasterPoint) => void): Set<string> {
  const stroke = new Set<string>();
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length];
    if (a && b) strokeSegment(stroke, a, b);
  }
  if (points.length < 3) return stroke;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (const item of stroke) {
    const separator = item.indexOf(","), x = Number(item.slice(0, separator));
    const y = Number(item.slice(separator + 1));
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const minX = Math.max(-1, x0 - 1), minY = Math.max(-1, y0 - 1);
  const maxX = Math.min(width, x1 + 1), maxY = Math.min(height, y1 + 1);
  const outside = new Set<string>([key(minX, minY)]);
  const queue: RasterPoint[] = [[minX, minY]];
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index]; if (!point) continue;
    const neighbours: RasterPoint[] = [[point[0] + 1, point[1]], [point[0] - 1,
      point[1]], [point[0], point[1] + 1], [point[0], point[1] - 1]];
    for (const [x, y] of neighbours) {
      if (x < minX || y < minY || x > maxX || y > maxY) continue;
      if (x >= 0 && y >= 0 && x < width && y < height && stroke.has(key(x, y))) continue;
      const item = key(x, y); if (!outside.has(item)) { outside.add(item); queue.push([x, y]); }
    }
  }
  const output = new Set(stroke);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
    if (!outside.has(key(x, y))) output.add(key(x, y));
  return output;
}
