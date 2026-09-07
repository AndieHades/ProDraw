// QuickShape: отдельный модуль обработки штриха поверх кисти/карандаша. Пока
// идёт freehand-штрих — копит точки; если в конце пользователь удерживает
// палец/мышь/стилус, распознаёт форму и заменяет raw-штрих ровной фигурой
// (превью S.qsShape), а на отпускании коммитит её в активный слой. Не трогает
// выделение/маски — рисует только по текущему слою через общий stamp.
import { S, G } from '../../core/state.ts';
import * as bus from '../../core/bus.ts';
import { cloneGrid } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { bres, rectEdges, ellipseEdges } from '../../logic/ShapeGeometry.ts';
import { recognizeShape } from '../../logic/quickshape.ts';
import { QUICKSHAPE } from '../../config/quickshape.ts';
import { stamp } from './stamp.js';
import { beginLegacyTileEdit, cancelLegacyTileEdit,
  legacyTileEditActive } from '../../core/history/legacyTileHistory.js';

let base = null, pts = null, engaged = false, timer = null, lastCell = null, tracking = false;
const enabled = () => S.tool === 'pencil' || S.tool === 'eraser'; // QuickShape — для freehand-кисти/ластика
const clearTimer = () => { clearTimeout(timer); timer = null; };
const drawShape = (sh) => (sh.type === 'rect' ? rectEdges : sh.type === 'ellipse' ? ellipseEdges : bres)(sh.x0, sh.y0, sh.x1, sh.y1, stamp);
const arm = () => { clearTimer(); timer = setTimeout(engage, QUICKSHAPE.holdMs); };

function engage() { if (!tracking || engaged) return; const sh = recognizeShape(pts); if (!sh) return; // не распознали — оставляем raw, ждём дальше
  const tiled = legacyTileEditActive(); if (tiled) cancelLegacyTileEdit(); // тайловая правка сама вернула холст
  else if (base) S.layers[S.cur].grid = cloneGrid(base); // убираем raw-штрих с холста
  engaged = true; markDirty(S.cur);
  if (tiled) beginLegacyTileEdit('QuickShape');
  S.qsShape = sh; bus.emit('render'); } // ровная форма показывается превью-оверлеем

// Снимок сетки нужен только там, где нет тайловой правки: она уже помнит
// тронутое ходом и возвращает холст сама. Копия полноцветного холста стоит
// целый буфер W×H×4 — на 2048×2048 это 16 МБ и двести миллисекунд на каждом
// нажатии, и именно она подвешивала рисование по мере заполнения слоя.
export function qsBegin(gx, gy) { tracking = enabled();
  if (!tracking) { base = null; pts = null; return; }
  base = legacyTileEditActive() ? null : cloneGrid(G());
  pts = [[gx, gy]]; engaged = false; lastCell = [gx, gy]; arm(); }

// true → QuickShape ведёт превью (raw-штрих рисовать не нужно)
export function qsMove(gx, gy) { if (!tracking) return false; if (engaged) return true;
  pts.push([gx, gy]);
  if (!lastCell || gx !== lastCell[0] || gy !== lastCell[1]) { lastCell = [gx, gy]; arm(); } // двинулся в новую клетку — заново ждём удержания
  return false; }

// true → форма зафиксирована (raw коммитить не нужно)
export function qsRelease() { clearTimer(); const did = engaged;
  if (did) { S.stroke = false; drawShape(S.qsShape); markDirty(S.cur); } // base восстановлен — стампим ровную форму поверх (pp молчит при stroke=false)
  base = null; pts = null; engaged = false; tracking = false; S.qsShape = null;
  if (did) bus.emit('render');
  return did; }
