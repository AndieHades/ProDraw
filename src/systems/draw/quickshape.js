// QuickShape: отдельный модуль обработки штриха поверх кисти/карандаша. Пока
// идёт freehand-штрих — копит точки; если в конце пользователь удерживает
// палец/мышь/стилус, распознаёт форму и заменяет raw-штрих ровной фигурой
// (превью S.qsShape), а на отпускании коммитит её в активный слой. Не трогает
// выделение/маски — рисует только по текущему слою через общий stamp.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { cloneGrid } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { bres, rectEdges, ellipseEdges } from '../../logic/raster.js';
import { recognizeShape } from '../../logic/quickshape.js';
import { QUICKSHAPE } from '../../config/quickshape.js';
import { stamp } from './stamp.js';

let base = null, pts = null, engaged = false, timer = null, lastCell = null;
const enabled = () => S.tool === 'pencil' || S.tool === 'eraser'; // QuickShape — для freehand-кисти/ластика
const clearTimer = () => { clearTimeout(timer); timer = null; };
const drawShape = (sh) => (sh.type === 'rect' ? rectEdges : sh.type === 'ellipse' ? ellipseEdges : bres)(sh.x0, sh.y0, sh.x1, sh.y1, stamp);
const arm = () => { clearTimer(); timer = setTimeout(engage, QUICKSHAPE.holdMs); };

function engage() { if (!base || engaged) return; const sh = recognizeShape(pts); if (!sh) return; // не распознали — оставляем raw, ждём дальше
  engaged = true; S.layers[S.cur].grid = cloneGrid(base); markDirty(S.cur); // убираем raw-штрих с холста
  S.qsShape = sh; bus.emit('render'); } // ровная форма показывается превью-оверлеем

export function qsBegin(gx, gy) { if (!enabled()) { base = null; return; }
  base = cloneGrid(G()); pts = [[gx, gy]]; engaged = false; lastCell = [gx, gy]; arm(); }

// true → QuickShape ведёт превью (raw-штрих рисовать не нужно)
export function qsMove(gx, gy) { if (!base) return false; if (engaged) return true;
  pts.push([gx, gy]);
  if (!lastCell || gx !== lastCell[0] || gy !== lastCell[1]) { lastCell = [gx, gy]; arm(); } // двинулся в новую клетку — заново ждём удержания
  return false; }

// true → форма зафиксирована (raw коммитить не нужно)
export function qsRelease() { clearTimer(); const did = engaged;
  if (did) { S.stroke = false; drawShape(S.qsShape); markDirty(S.cur); } // base восстановлен — стампим ровную форму поверх (pp молчит при stroke=false)
  base = null; pts = null; engaged = false; S.qsShape = null; if (did) bus.emit('render');
  return did; }
