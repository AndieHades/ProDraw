import { cellsSelectionMask, isSelectionMask, SelectionMask } from './selection-mask.ts';

const clipRect = (r, W, H) => { const out = { x0: Math.max(0, r.x0), y0: Math.max(0, r.y0),
  x1: Math.min(W - 1, r.x1), y1: Math.min(H - 1, r.y1) };
  return out.x0 <= out.x1 && out.y0 <= out.y1 ? out : null; };
const translated = (r, dx, dy, W, H) => clipRect({ x0: r.x0 + dx, y0: r.y0 + dy,
  x1: r.x1 + dx, y1: r.y1 + dy }, W, H);
const outsideStrips = (r, W, H) => [{ x0: 0, y0: 0, x1: W - 1, y1: r.y0 - 1 },
  { x0: 0, y0: r.y1 + 1, x1: W - 1, y1: H - 1 },
  { x0: 0, y0: r.y0, x1: r.x0 - 1, y1: r.y1 },
  { x0: r.x1 + 1, y0: r.y0, x1: W - 1, y1: r.y1 }].map((v) => clipRect(v, W, H)).filter(Boolean);

export function cloneSelectionMask(mask, _sel, width, height) {
  if (!mask) return null; return isSelectionMask(mask) ? mask.clone() : cellsSelectionMask(mask, width, height);
}

export function shiftSelectionMask(mask, dx, dy, width, height) {
  if (!mask) return null; const source = isSelectionMask(mask) ? mask : cellsSelectionMask(mask, width, height);
  let rects = source.rects.map((r) => translated(r, dx, dy, width, height)).filter(Boolean);
  if (source.complement && (dx || dy)) { const sourceDomain = clipRect({ x0: dx, y0: dy,
    x1: width - 1 + dx, y1: height - 1 + dy }, width, height);
    rects = rects.concat(sourceDomain ? outsideStrips(sourceDomain, width, height) :
      [{ x0: 0, y0: 0, x1: width - 1, y1: height - 1 }]); }
  const out = new SelectionMask(width, height, rects, source.complement);
  source.include.forEachPoint((x, y) => out.forceSelected(x + dx, y + dy));
  source.exclude.forEachPoint((x, y) => out.forceUnselected(x + dx, y + dy)); return out;
}

function scaledRange(a, b, origin, oldSize, nextOrigin, nextSize) {
  const lo = Math.max(0, a - origin), hi = Math.min(oldSize - 1, b - origin); if (lo > hi) return null;
  return [nextOrigin + Math.ceil(lo * nextSize / oldSize),
    nextOrigin + Math.ceil((hi + 1) * nextSize / oldSize) - 1];
}
function scaledRect(r, from, to) { const xr = scaledRange(r.x0, r.x1, from.x0,
  from.x1 - from.x0 + 1, to.x0, to.x1 - to.x0 + 1);
  const yr = scaledRange(r.y0, r.y1, from.y0, from.y1 - from.y0 + 1,
    to.y0, to.y1 - to.y0 + 1); return xr && yr ? { x0: xr[0], y0: yr[0], x1: xr[1], y1: yr[1] } : null; }
function mapPointRange(x, y, from, to, fn) { const xr = scaledRange(x, x, from.x0,
  from.x1 - from.x0 + 1, to.x0, to.x1 - to.x0 + 1);
  const yr = scaledRange(y, y, from.y0, from.y1 - from.y0 + 1,
    to.y0, to.y1 - to.y0 + 1); if (!xr || !yr) return;
  for (let yy = yr[0]; yy <= yr[1]; yy++) for (let xx = xr[0]; xx <= xr[1]; xx++) fn(xx, yy);
}

export function resizeSelectionMask(mask, from, to, width, height) {
  if (!mask) return null; const source = isSelectionMask(mask) ? mask : cellsSelectionMask(mask, width, height);
  const mapped = source.rects.map((r) => scaledRect(r, from, to)).filter(Boolean);
  const rects = source.complement ? mapped.concat(outsideStrips(to, width, height)) : mapped;
  const out = new SelectionMask(width, height, rects, source.complement);
  source.include.forEachPoint((x, y) => mapPointRange(x, y, from, to,
    (nx, ny) => out.forceSelected(nx, ny)));
  source.exclude.forEachPoint((x, y) => mapPointRange(x, y, from, to,
    (nx, ny) => out.forceUnselected(nx, ny))); return out;
}

const reflectionFns = (cfg) => { const out = [];
  if (cfg.x) out.push(([x, y]) => [Math.round(2 * cfg.axisX - x), y]);
  if (cfg.y) out.push(([x, y]) => [x, Math.round(2 * cfg.axisY - y)]);
  if (cfg.d1) out.push(([x, y]) => [Math.round(y - cfg.diagP), Math.round(x + cfg.diagP)]);
  if (cfg.d2) out.push(([x, y]) => [Math.round(cfg.diagN - y), Math.round(cfg.diagN - x)]); return out; };
function reflectedRect(rect, reflect, width, height) {
  const pts = [reflect([rect.x0, rect.y0]), reflect([rect.x1, rect.y0]),
    reflect([rect.x0, rect.y1]), reflect([rect.x1, rect.y1])];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return clipRect({ x0: Math.min(...xs), y0: Math.min(...ys),
    x1: Math.max(...xs), y1: Math.max(...ys) }, width, height);
}
export function symmetrizeSimpleSelectionMask(mask, cfg) {
  if (!isSelectionMask(mask) || mask.complement || mask.include.size || mask.exclude.size) return null;
  const refs = reflectionFns(cfg), queue = [...mask.rects], rects = [], seen = new Set();
  for (let i = 0; i < queue.length && i < 64; i++) { const rect = queue[i], key = [rect.x0, rect.y0, rect.x1, rect.y1].join(',');
    if (seen.has(key)) continue; seen.add(key); rects.push(rect);
    for (const reflect of refs) { const next = reflectedRect(rect, reflect, mask.width, mask.height);
      if (next && !seen.has([next.x0, next.y0, next.x1, next.y1].join(','))) queue.push(next); } }
  return new SelectionMask(mask.width, mask.height, rects);
}
