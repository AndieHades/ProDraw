// Пиксель-перфект: при Г-образном уголке штриха убираем средний пиксель.
import { S, G } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';

let ppPath = [], ppOrig = new Map();
export function resetPP() { ppPath = []; ppOrig = new Map(); }

export function ppVisit(x, y) {
  if (!S.ppOn || !S.stroke) return;
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  const last = ppPath[ppPath.length - 1];
  if (last && last[0] === x && last[1] === y) return;
  const g = G(), k = y * S.W + x;
  if (!ppOrig.has(k)) ppOrig.set(k, g[y][x] ? g[y][x].slice() : null);
  const keep = (xx, yy) => { const kk = yy * S.W + xx; if (!ppOrig.has(kk)) ppOrig.set(kk, g[yy][xx] ? g[yy][xx].slice() : null); };
  if (symA()) keep(S.W - 1 - x, y);
  if (symHA()) keep(x, S.H - 1 - y);
  if (symA() && symHA()) keep(S.W - 1 - x, S.H - 1 - y);
  ppPath.push([x, y]);
  const n = ppPath.length;
  if (n < 3) return;
  const A = ppPath[n - 3], B = ppPath[n - 2], C = ppPath[n - 1];
  const o1 = Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) === 1, o2 = Math.abs(B[0] - C[0]) + Math.abs(B[1] - C[1]) === 1;
  if (o1 && o2 && A[0] !== C[0] && A[1] !== C[1]) {
    const undoAt = (xx, yy) => { const mv = ppOrig.get(yy * S.W + xx); g[yy][xx] = mv ? mv.slice() : null; };
    undoAt(B[0], B[1]);
    if (symA()) undoAt(S.W - 1 - B[0], B[1]);
    if (symHA()) undoAt(B[0], S.H - 1 - B[1]);
    if (symA() && symHA()) undoAt(S.W - 1 - B[0], S.H - 1 - B[1]);
    markDirty(S.cur); ppPath.splice(n - 2, 1);
  }
}
