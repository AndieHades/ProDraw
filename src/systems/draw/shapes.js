// Инструменты «линия» и «прямоугольник»: интерполяция Брезенхемом и фиксация
// превью в слой (углы целы — pp молчит при stroke=false).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { bres, closedContourMask, ellipseEdges, ellipseFill, parseRasterPoint,
  rectEdges, rectFill } from '../../logic/ShapeGeometry.ts';
import { maskRound } from '../../logic/brush-mask.js';
import { stamp } from './stamp.js';
import { brushStampWith, flushBrushStroke } from './brush.js';
import { createCellPainter, setCell } from './cells.js';
import { afterStroke, beginStroke } from './stroke.js';

export const line = (x0, y0, x1, y1) => {
  bres(x0, y0, x1, y1, (x, y) => stamp(x, y, false)); flushBrushStroke();
};

export function commitLine() {
  const lp = S.linePrev; S.linePrev = null; S.lineStart = null;
  if (!lp) { bus.emit('render'); return; }
  beginStroke(S.layers[S.cur]?.kind === 'pixel', true);
  const painter = createCellPainter(false, true);
  const draw = (x, y) => brushStampWith(x, y, 'pencil',
    (px, py) => painter.paint(px, py, 1));
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
  const m = maskRound(S.pencilSize), ox = m.w >> 1, oy = m.h >> 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.data[y * m.w + x]) setCell(cx - ox + x, cy - oy + y, cell);
}

export function contourStroke(x0, y0, x1, y1, cell = contourCell()) {
  bres(x0, y0, x1, y1, (x, y) => contourDab(x, y, cell));
}

function contourDabMask(set, cx, cy) {
  const m = maskRound(S.pencilSize), ox = m.w >> 1, oy = m.h >> 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.data[y * m.w + x]) {
    const px = cx - ox + x, py = cy - oy + y;
    if (px >= 0 && py >= 0 && px < S.W && py < S.H) set.add(px + ',' + py);
  }
}

function contourStrokeMask(set, x0, y0, x1, y1) {
  bres(x0, y0, x1, y1, (x, y) => contourDabMask(set, x, y));
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
  const mask = closedContourMask(pts, S.W, S.H, (output, a, b) =>
    contourStrokeMask(output, a[0], a[1], b[0], b[1]));
  const painter = createCellPainter(false, true);
  for (const k of mask) { const [x, y] = parseRasterPoint(k); painter.paint(x, y, 1); }
  painter.flush();
  S.stroke = false;
  actions.run('color.used', S.active);
  bus.emit('render'); bus.emit('layers'); afterStroke();
}
