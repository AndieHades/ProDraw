// Инструменты «линия» и «прямоугольник»: интерполяция Брезенхемом и фиксация
// превью в слой (углы целы — pp молчит при stroke=false).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { bres, parseKey, rectEdges, rectFill, ellipseEdges, ellipseFill } from '../../logic/raster.js';
import { maskRound } from '../../logic/brush-mask.js';
import { stamp } from './stamp.js';
import { setCell } from './cells.js';
import { afterStroke } from './stroke.js';

export const line = (x0, y0, x1, y1) => bres(x0, y0, x1, y1, stamp);

export function commitLine() {
  const lp = S.linePrev; S.linePrev = null; S.lineStart = null;
  if (!lp) { bus.emit('render'); return; }
  snapshot();
  if (S.tool === 'rect') (S.fillShape.rect ? rectFill : rectEdges)(lp[0], lp[1], lp[2], lp[3], stamp);
  else if (S.tool === 'ellipse') (S.fillShape.ellipse ? ellipseFill : ellipseEdges)(lp[0], lp[1], lp[2], lp[3], stamp);
  else line(lp[0], lp[1], lp[2], lp[3]);
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
  const outside = new Set(), q = [[0, 0]], W = S.W + 2, H = S.H + 2;
  const outsideKey = (x, y) => x + ',' + y;
  const blocked = (x, y) => x > 0 && y > 0 && x <= S.W && y <= S.H && stroke.has((x - 1) + ',' + (y - 1));
  outside.add('0,0');
  for (let qi = 0; qi < q.length; qi++) {
    const [x, y] = q[qi], ns = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of ns) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || blocked(nx, ny)) continue;
      const k = outsideKey(nx, ny); if (outside.has(k)) continue;
      outside.add(k); q.push([nx, ny]);
    }
  }
  const out = new Set(stroke);
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (!outside.has(outsideKey(x + 1, y + 1))) out.add(x + ',' + y);
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
  if (!wasStroke) snapshot();
  const cell = contourCell();
  const mask = contourClosedMask(pts);
  for (const k of mask) { const [x, y] = parseKey(k); setCell(x, y, cell); }
  S.stroke = false;
  actions.run('color.used', S.active);
  bus.emit('render'); bus.emit('layers'); afterStroke();
}
