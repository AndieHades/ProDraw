// Регистрация обработчиков холста для инструментов рисования. Ввод вызывает
// down/move/up; координаты клетки приходят готовыми из системы ввода.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { ensureLayer } from '../../core/document.js';
import { toast, t } from '../../core/dom.js';
import { SHAPE_SNAP_MS } from '../../config/timings.js';
import { stamp } from './stamp.js';
import { line, commitLine, commitContour, contourDab, contourStroke } from './shapes.js';
import { beginStroke, afterStroke } from './stroke.js';
import { qsBegin, qsMove, qsRelease } from './quickshape.js';
import { shadingActive } from './shading.js';
import { clamp } from '../../logic/math.js';

let last = null;

// --- удержание фигуры на месте → ровный квадрат/круг (тач-альтернатива Shift) ---
let snapTimer = null, snapCell = null, snapped = false;
const canSnap = () => S.tool === 'rect' || S.tool === 'ellipse';
const lineContour = () => S.tool === 'line' && S.lineMode === 'contour';
const clampX = (x) => clamp(x, 0, S.W - 1);
const clampY = (y) => clamp(y, 0, S.H - 1);
function square(gx, gy) { const dx = gx - S.lineStart[0], dy = gy - S.lineStart[1], s = Math.max(Math.abs(dx), Math.abs(dy));
  return [S.lineStart[0] + (dx < 0 ? -1 : 1) * s, S.lineStart[1] + (dy < 0 ? -1 : 1) * s]; }
function snap45(gx, gy) {
  const [x0, y0] = S.lineStart, dx = gx - x0, dy = gy - y0;
  if (!dx && !dy) return [gx, gy];
  const dir = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8, m = Math.max(Math.abs(dx), Math.abs(dy));
  const map = [[m, 0], [m, m], [0, m], [-m, m], [-m, 0], [-m, -m], [0, -m], [m, -m]][dir];
  return [clampX(x0 + map[0]), clampY(y0 + map[1])];
}
function armSnap(gx, gy) { clearTimeout(snapTimer);
  if (snapped || !canSnap()) return;
  snapTimer = setTimeout(() => { if (!S.lineStart) return; snapped = true;
    const [nx, ny] = square(gx, gy); S.linePrev = [S.lineStart[0], S.lineStart[1], nx, ny]; bus.emit('render');
    toast(t(S.tool === 'ellipse' ? 'toast.shapeCircle' : 'toast.shapeSquare')); }, SHAPE_SNAP_MS); }
function endSnap() { clearTimeout(snapTimer); snapTimer = null; snapCell = null; snapped = false; }

const brush = {
  down({ gx, gy }) { ensureLayer(); beginStroke(); qsBegin(gx, gy); stamp(gx, gy); last = [gx, gy]; bus.emit('render'); },
  move({ gx, gy }) { if (qsMove(gx, gy)) { bus.emit('render'); return; } // QuickShape выровнял форму — raw больше не рисуем
    if (last) line(last[0], last[1], gx, gy); else stamp(gx, gy); last = [gx, gy]; bus.emit('render'); },
  up() { qsRelease(); S.stroke = false; last = null;
    if ((S.tool === 'pencil' && !shadingActive()) || (S.tool === 'adjust' && S.adjMode === 'colorize')) actions.run('color.used', S.active);
    afterStroke(); bus.emit('render'); }, // удержал → коммитит ровную форму, иначе raw остаётся
};

const shape = {
  down({ gx, gy }) { ensureLayer(); if (lineContour()) { const x = clampX(gx), y = clampY(gy);
    beginStroke(); S.linePath = { pts: [[x, y]] }; contourDab(x, y); bus.emit('render'); return; }
    S.lineStart = [gx, gy]; S.linePrev = [gx, gy, gx, gy];
    snapCell = [gx, gy]; snapped = false; armSnap(gx, gy); bus.emit('render'); },
  move({ gx, gy, e }) { if (lineContour()) { const pts = S.linePath && S.linePath.pts; if (!pts) return;
    const x = clampX(gx), y = clampY(gy), p = pts[pts.length - 1]; if (!p || p[0] !== x || p[1] !== y) { contourStroke(p[0], p[1], x, y); pts.push([x, y]); } bus.emit('render'); return; }
    if (!S.lineStart) return;
    if (!snapCell || gx !== snapCell[0] || gy !== snapCell[1]) { snapCell = [gx, gy]; armSnap(gx, gy); } // двинулся в новую клетку — заново ждём удержания
    if (canSnap() && (snapped || (e && e.shiftKey))) [gx, gy] = square(gx, gy); // удержание или Shift — квадрат/круг
    else if (S.tool === 'line' && e && e.shiftKey) [gx, gy] = snap45(gx, gy);
    S.linePrev = [S.lineStart[0], S.lineStart[1], gx, gy]; bus.emit('render'); },
  up() { endSnap(); if (lineContour()) { commitContour(); return; } if (S.linePrev) commitLine(); },
};

const fill = { down({ gx, gy }) { ensureLayer(); snapshot(); stamp(gx, gy); actions.run('color.used', S.active); bus.emit('render'); afterStroke(); } };

for (const t of ['pencil', 'eraser', 'adjust']) registerTool(t, brush);
for (const t of ['line', 'rect', 'ellipse']) registerTool(t, shape);
registerTool('fill', fill);
bus.on('before-tool-change', () => { if (S.linePath) commitContour(); });
