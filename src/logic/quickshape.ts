// Распознавание формы нарисованного штриха для QuickShape. Чистая логика:
// массив точек [x,y] → { type:'line'|'rect'|'ellipse', x0,y0,x1,y1 } или null
// (форма не распознана — оставляем raw-штрих). Без DOM и без state.
export type ShapePoint = readonly [x: number, y: number];

export interface RecognizedShape {
  readonly type: "line" | "rect" | "ellipse";
  readonly x0: number; readonly y0: number;
  readonly x1: number; readonly y1: number;
}

const dist = (a: ShapePoint, b: ShapePoint): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

export function recognizeShape(
  pts: readonly ShapePoint[] | null | undefined
): RecognizedShape | null {
  if (!pts || pts.length < 4) return null;
  const s = pts[0] as ShapePoint, e = pts[pts.length - 1] as ShapePoint;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, pathLen = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i] as ShapePoint;
    if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
    if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
    if (i) pathLen += dist(pts[i - 1] as ShapePoint, p); }
  const w = maxx - minx, h = maxy - miny, diag = Math.hypot(w, h);
  if (diag < 4) return null;
  const lineLen = dist(s, e), closed = lineLen <= 0.28 * diag;
  if (!closed) return lineLen > 0 && pathLen / lineLen < 1.22
    ? { type: "line", x0: s[0], y0: s[1], x1: e[0], y1: e[1] } : null;

  // замкнутая фигура: прямоугольник или эллипс по средней нормированной ошибке
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const rx = Math.max(0.5, w / 2), ry = Math.max(0.5, h / 2);
  const m = Math.max(0.5, Math.min(rx, ry));
  let eErr = 0, rErr = 0;
  for (const p of pts) {
    eErr += Math.abs(Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry) - 1);
    rErr += Math.min(p[0] - minx, maxx - p[0], p[1] - miny, maxy - p[1]) / m;
  }
  eErr /= pts.length; rErr /= pts.length;
  if (Math.min(eErr, rErr) > 0.42) return null; // ни прямоугольник, ни эллипс
  if (rErr < eErr) return { type: "rect", x0: minx, y0: miny, x1: maxx, y1: maxy };
  if (Math.abs(w - h) <= 0.18 * Math.max(w, h)) { // близкие стороны → круг
    const r = Math.round((w + h) / 4);
    return { type: "ellipse", x0: Math.round(cx - r), y0: Math.round(cy - r),
      x1: Math.round(cx + r), y1: Math.round(cy + r) }; }
  return { type: "ellipse", x0: minx, y0: miny, x1: maxx, y1: maxy };
}
