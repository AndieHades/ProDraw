// SymmetryOperationMapper: одно действие пользователя → набор симметричных.
// Чистая логика без DOM/state. Старые sx/sy сохраняют поведение по центру,
// дополнительный opts включает произвольные оси и диагонали.
import { parseKey } from './raster.js';

const finite = (v) => Number.isFinite(v);
const inBounds = (x, y, W, H) => x >= 0 && y >= 0 && x < W && y < H;
export const centerSymmetryAxes = (W, H) => ({
  axisX: (W - 1) / 2,
  axisY: (H - 1) / 2,
  diagP: (H - W) / 2, // y = x + diagP
  diagN: (W + H - 2) / 2, // y = -x + diagN
});

export function symmetryAxes(W, H, opts = {}) {
  const c = centerSymmetryAxes(W, H);
  return {
    x: !!opts.x,
    y: !!opts.y,
    d1: !!opts.d1,
    d2: !!opts.d2,
    axisX: finite(opts.axisX) ? opts.axisX : c.axisX,
    axisY: finite(opts.axisY) ? opts.axisY : c.axisY,
    diagP: finite(opts.diagP) ? opts.diagP : c.diagP,
    diagN: finite(opts.diagN) ? opts.diagN : c.diagN,
  };
}

// зеркальные копии точки (включая её саму) по активным осям
export function mirrorPoints(x, y, W, H, sx, sy, opts = null) {
  const cfg = symmetryAxes(W, H, { ...(opts || {}), x: sx || (opts && opts.x), y: sy || (opts && opts.y) });
  const refs = [];
  if (cfg.x) refs.push((p) => [Math.round(2 * cfg.axisX - p[0]), p[1]]);
  if (cfg.y) refs.push((p) => [p[0], Math.round(2 * cfg.axisY - p[1])]);
  if (cfg.d1) refs.push((p) => [Math.round(p[1] - cfg.diagP), Math.round(p[0] + cfg.diagP)]);
  if (cfg.d2) refs.push((p) => [Math.round(cfg.diagN - p[1]), Math.round(cfg.diagN - p[0])]);
  if (!refs.length) return [[x, y]];
  const out = [], seen = new Set(), q = [[x, y]];
  for (let i = 0; i < q.length && i < 64; i++) {
    const p = q[i], k = p[0] + ',' + p[1];
    if (seen.has(k)) continue;
    seen.add(k);
    if (inBounds(p[0], p[1], W, H)) out.push(p);
    for (const rf of refs) {
      const n = rf(p), nk = n[0] + ',' + n[1];
      if (!seen.has(nk) && inBounds(n[0], n[1], W, H)) q.push(n);
    }
  }
  return out; }

// маска + все её зеркальные копии (mapSelectionMask)
export function expandMask(mask, W, H, sx, sy, opts = null) { if (!sx && !sy && !(opts && (opts.x || opts.y || opts.d1 || opts.d2))) return new Set(mask);
  const out = new Set();
  for (const k of mask) { const [x, y] = parseKey(k);
    for (const [mx, my] of mirrorPoints(x, y, W, H, sx, sy, opts)) out.add(mx + ',' + my); }
  return out; }

// зеркальные дельты переноса (mapMoveDelta): по активной оси знак инвертируется
export function mirrorDeltas(dx, dy, sx, sy) { const out = [[dx, dy]];
  if (sx) out.push([-dx, dy]);
  if (sy) out.push([dx, -dy]);
  if (sx && sy) out.push([-dx, -dy]);
  return out; }
