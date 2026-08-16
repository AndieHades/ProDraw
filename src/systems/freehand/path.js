// Selection Path: строит временный контур (Continuous/Segment). Точки — в
// координатах сетки. Ничего не знает о масках и операциях выделения — только
// геометрия пути и близость к стартовой точке (для замыкания/подсветки).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { LASSO_CLOSE_PX } from '../../config/lasso.js';

const last = (pts) => pts[pts.length - 1];
// порог замыкания в клетках: экранные px → клетки по текущему зуму (минимум одна клетка)
const closeDist = () => Math.max(1, LASSO_CLOSE_PX / S.view.zoom);

export const pathActive = () => !!S.lassoPath;
export const getPoints = () => (S.lassoPath ? S.lassoPath.pts : null);
export const nearStart = () => !!(S.lassoPath && S.lassoPath.near);

export function beginPath(x, y) { S.lassoPath = { pts: [[x, y]], near: false }; bus.emit('render'); }

export function addPoint(x, y) { if (!S.lassoPath) return;
  const p = last(S.lassoPath.pts);
  if (!p || p[0] !== x || p[1] !== y) S.lassoPath.pts.push([x, y]);
  const s = S.lassoPath.pts[0];
  S.lassoPath.near = S.lassoPath.pts.length > 2 && Math.hypot(x - s[0], y - s[1]) <= closeDist();
  bus.emit('render'); }

export function resetPath() { if (!S.lassoPath) return; S.lassoPath = null; bus.emit('render'); }
