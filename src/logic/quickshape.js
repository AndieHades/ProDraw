// Распознавание формы нарисованного штриха для QuickShape. Чистая логика:
// массив точек [x,y] → { type:'line'|'rect'|'ellipse', x0,y0,x1,y1 } или null
// (форма не распознана — оставляем raw-штрих). Без DOM и без state.
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function recognizeShape(pts) {
  if (!pts || pts.length < 4) return null;
  const s = pts[0], e = pts[pts.length - 1];
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, pathLen = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i];
    if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
    if (i) pathLen += dist(pts[i - 1], pts[i]); }
  const w = maxx - minx, h = maxy - miny, diag = Math.hypot(w, h);
  if (diag < 4) return null;
  const lineLen = dist(s, e), closed = lineLen <= 0.28 * diag;
  if (!closed) return lineLen > 0 && pathLen / lineLen < 1.22 ? { type: 'line', x0: s[0], y0: s[1], x1: e[0], y1: e[1] } : null;

  // замкнутая фигура: прямоугольник или эллипс по средней нормированной ошибке
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, rx = Math.max(0.5, w / 2), ry = Math.max(0.5, h / 2), m = Math.max(0.5, Math.min(rx, ry));
  let eErr = 0, rErr = 0;
  for (const p of pts) {
    eErr += Math.abs(Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry) - 1);          // насколько точка лежит на эллипсе
    rErr += Math.min(p[0] - minx, maxx - p[0], p[1] - miny, maxy - p[1]) / m;       // расстояние до ближайшей грани bounds
  }
  eErr /= pts.length; rErr /= pts.length;
  if (Math.min(eErr, rErr) > 0.42) return null;                                     // ни прямоугольник, ни эллипс — оставляем raw
  if (rErr < eErr) return { type: 'rect', x0: minx, y0: miny, x1: maxx, y1: maxy };
  if (Math.abs(w - h) <= 0.18 * Math.max(w, h)) { const r = Math.round((w + h) / 4); // близкие стороны → круг (квадратные bounds)
    return { type: 'ellipse', x0: Math.round(cx - r), y0: Math.round(cy - r), x1: Math.round(cx + r), y1: Math.round(cy + r) }; }
  return { type: 'ellipse', x0: minx, y0: miny, x1: maxx, y1: maxy };
}
