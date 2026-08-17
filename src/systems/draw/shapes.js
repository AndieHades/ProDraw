// Инструменты «линия» и «прямоугольник»: интерполяция Брезенхемом и фиксация
// превью в слой (углы целы — pp молчит при stroke=false).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { bres, parseKey, rectEdges, rectFill, ellipseEdges, ellipseFill } from '../../logic/raster.js';
import { maskRound } from '../../logic/brush-mask.js';
import { stamp } from './stamp.js';
import { brushStampWith } from './brush.js';
import { createCellPainter, setCell } from './cells.js';
import { afterStroke, beginStroke } from './stroke.js';

export const line = (x0, y0, x1, y1) => bres(x0, y0, x1, y1, stamp);

export function commitLine() {
  const lp = S.linePrev; S.linePrev = null; S.lineStart = null;
  if (!lp) { bus.emit('render'); return; }
  beginStroke(S.layers[S.cur]?.kind === 'pixel', true);
  const painter = createCellPainter(false, true);
  const draw = (x, y) => brushStampWith(x, y, 'pencil',
    (px, py) => painter.paint(px, py, S.brushes.pencil.op));
  if (S.tool === 'rect') (S.fillShape.rect ? rectFill : rectEdges)(lp[0], lp[1], lp[2], lp[3], draw);
  else if (S.tool === 'ellipse') (S.fillShape.ellipse ? ellipseFill : ellipseEdges)(lp[0], lp[1], lp[2], lp[3], draw);
  else bres(lp[0], lp[1], lp[2], lp[3], draw);
  painter.flush(); S.stroke = false;
  actions.run('color.used', S.active);
  bus.emit('render'); afterStroke();
}

function contourCell() {
  return [S.active[0], S.active[1], S.active[2], 255];
}

export function contourDab(cx, cy, cell = contourCell()) {
  const m = maskRound(S.brushes.pencil.size), ox = m.w >> 1, oy = m.h >> 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.data[y * m.w + x]) setCell(cx - ox + x, cy - oy + y, cell);
}

export function contourStroke(x0, y0, x1, y1, cell = contourCell()) {
  bres(x0, y0, x1, y1, (x, y) => contourDab(x, y, cell));
}

function contourDabMask(set, cx, cy) {
  const m = maskRound(S.brushes.pencil.size), ox = m.w >> 1, oy = m.h >> 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.data[y * m.w + x]) {
    const px = cx - ox + x, py = cy - oy + y;
    if (px >= 0 && py >= 0 && px < S.W && py < S.H) set.add(px + ',' + py);
  }
}

function contourStrokeMask(set, x0, y0, x1, y1) {
  bres(x0, y0, x1, y1, (x, y) => contourDabMask(set, x, y));
}

function contourClosedMask(pts) {
  const stroke = new Set(), n = pts.length;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; contourStrokeMask(stroke, a[0], a[1], b[0], b[1]); }
  if (n < 3) return stroke;
  let x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (const key of stroke) { const [x, y] = parseKey(key);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const minx = Math.max(-1, x0 - 1), miny = Math.max(-1, y0 - 1);
  const maxx = Math.min(S.W, x1 + 1), maxy = Math.min(S.H, y1 + 1);
  const outside = new Set(), q = [[minx, miny]];
  const outsideKey = (x, y) => x + ',' + y;
  const blocked = (x, y) => x >= 0 && y >= 0 && x < S.W && y < S.H && stroke.has(x + ',' + y);
  outside.add(outsideKey(minx, miny));
  for (let qi = 0; qi < q.length; qi++) {
    const [x, y] = q[qi], ns = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of ns) {
      if (nx < minx || ny < miny || nx > maxx || ny > maxy || blocked(nx, ny)) continue;
      const k = outsideKey(nx, ny); if (outside.has(k)) continue;
      outside.add(k); q.push([nx, ny]);
    }
  }
  const out = new Set(stroke);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
    if (!outside.has(outsideKey(x, y))) out.add(x + ',' + y);
  return out;
}

export function commitContour(pts = S.linePath && S.linePath.pts) {
  const wasStroke = S.stroke;
  S.linePath = null; S.lineStart = null; S.linePrev = null;
  if (!pts || pts.length < 2) {
    S.stroke = false;
    if (wasStroke && pts && pts.length) actions.run('color.used', S.active);
    bus.emit('render'); if (wasStroke) { bus.emit('layers'); afterStroke(); }
    return;
  }
  if (!wasStroke) beginStroke(S.layers[S.cur]?.kind === 'pixel', true);
  const mask = contourClosedMask(pts);
  const painter = createCellPainter(false, true);
  for (const k of mask) { const [x, y] = parseKey(k); painter.paint(x, y, 1); }
  painter.flush();
  S.stroke = false;
  actions.run('color.used', S.active);
  bus.emit('render'); bus.emit('layers'); afterStroke();
}
