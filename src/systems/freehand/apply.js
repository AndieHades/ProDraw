// Мост «контур → маска»: замыкает путь, растеризует его в множество клеток и
// применяет выбранную операцию выделения. Способ построения контура ему не
// важен (Continuous/Segment) — общая точка для любых инструментов выделения.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.js';
import { polygonToMask } from '../../logic/poly-mask.js';
import { LASSO_MIN_POINTS } from '../../config/lasso.js';
import { getPoints, resetPath } from './path.js';

export function closePath() {
  const pts = getPoints();
  const mask = pts && pts.length >= LASSO_MIN_POINTS ? polygonToMask(pts, S.W, S.H) : null;
  resetPath(); // путь — временный: после растеризации удаляется, выделение живёт как маска
  if (mask && mask.size) actions.run('selection.applyOp', mask, S.lassoOp);
}
