import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { updateTextLayerGrid } from '../../core/text-layer.js';
import { C } from '../../styles/canvas-colors.js';

let boxDrag = null;
let sourceFn = () => null, layerFn = () => null, fontsFn = () => [], placeFn = () => {}, editingFn = () => false;

export function configureFrame(opts) {
  sourceFn = opts.source; layerFn = opts.layer; fontsFn = opts.fonts; placeFn = opts.place;
  editingFn = opts.editing || editingFn;
}

function framePoints(src = sourceFn()) {
  if (!src) return null;
  const b = src.box, tr = src.transform, cx = b.x + b.w / 2 + tr.x, cy = b.y + b.h / 2 + tr.y;
  const ca = Math.cos(tr.rotation), sa = Math.sin(tr.rotation);
  return [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]]
    .map(([x, y]) => ({ x: cx + x * tr.scaleX * ca - y * tr.scaleY * sa, y: cy + x * tr.scaleX * sa + y * tr.scaleY * ca }));
}

export function drawFrame({ ctx, ox, oy, z }) {
  const pts = framePoints();
  if (!pts || S.rotMode) return;
  const p = pts.map((q) => ({ x: ox + q.x * z, y: oy + q.y * z }));
  ctx.save(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.accent; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
  ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.accent;
  for (const q of p) ctx.fillRect(q.x - 4, q.y - 4, 8, 8);
  ctx.restore();
}

function localPoint(src, gx, gy) {
  const b = src.box, tr = src.transform, cx = b.x + b.w / 2 + tr.x, cy = b.y + b.h / 2 + tr.y;
  const ca = Math.cos(-tr.rotation), sa = Math.sin(-tr.rotation), dx = gx - cx, dy = gy - cy;
  return { x: (dx * ca - dy * sa) / tr.scaleX + b.w / 2, y: (dx * sa + dy * ca) / tr.scaleY + b.h / 2 };
}

function frameHit(gx, gy) {
  const src = sourceFn();
  if (!src || S.tool !== 'text' || S.rotMode) return null;
  const q = localPoint(src, gx, gy), b = src.box, tol = Math.max(1, 8 / S.view.zoom);
  const l = Math.abs(q.x) <= tol, r = Math.abs(q.x - b.w) <= tol, t = Math.abs(q.y) <= tol, bot = Math.abs(q.y - b.h) <= tol;
  if (q.x < -tol || q.x > b.w + tol || q.y < -tol || q.y > b.h + tol) return null;
  if ((l || r) && (t || bot)) return (t ? 't' : 'b') + (l ? 'l' : 'r');
  if (l) return 'l'; if (r) return 'r'; if (t) return 't'; if (bot) return 'b';
  return null;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function applyBoxDrag(gx, gy) {
  const { src, layer, box, side } = boxDrag, q = localPoint(src, gx, gy), next = { ...box };
  if (side.includes('l')) { const d = clamp(Math.round(q.x), 0, box.w - 1); next.x = box.x + d; next.w = box.w - d; }
  if (side.includes('r')) next.w = Math.max(1, Math.round(q.x));
  if (side.includes('t')) { const d = clamp(Math.round(q.y), 0, box.h - 1); next.y = box.y + d; next.h = box.h - d; }
  if (side.includes('b')) next.h = Math.max(1, Math.round(q.y));
  src.box = next;
  if (layer) { updateTextLayerGrid(layer, S.W, S.H, fontsFn()); markDirty(S.layers.indexOf(layer)); }
  placeFn(); bus.emit('render'); if (layer) bus.emit('layers');
}

function cursor(hit) {
  if (!hit) return null;
  if (hit === 'tl' || hit === 'br') return 'nwse-resize';
  if (hit === 'tr' || hit === 'bl') return 'nesw-resize';
  return hit === 'l' || hit === 'r' ? 'ew-resize' : 'ns-resize';
}

export const frameHandler = {
  down({ gx, gy }) {
    const side = frameHit(gx, gy);
    if (!side) return false;
    const src = sourceFn(), layer = layerFn();
    if (layer && !editingFn()) snapshot();
    boxDrag = { side, src, layer, box: { ...src.box } };
    return true;
  },
  move({ gx, gy }) { if (boxDrag) applyBoxDrag(gx, gy); },
  up() { boxDrag = null; },
  hover({ gx, gy }) { return cursor(frameHit(gx, gy)); },
};
