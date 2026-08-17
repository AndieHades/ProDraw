// Постоянные ручки выделения: тянут/двигают только область выделения, не пиксели.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, toast, t } from '../../ui/dom/ShellDom.ts';
import { selHit } from '../../core/selection.js';
import { registerGlobal } from '../../core/canvas-handlers.ts';
import { cloneSelectionMask, resizeSelectionMask, shiftSelectionMask } from '../../logic/mask-ops.js';
import { clamp as clampv } from '../../logic/math.ts';

let drag = null;
const cloneSel = (s) => (s ? { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 } : null);
const cloneMask = (m, sel) => cloneSelectionMask(m, sel, S.W, S.H);
const clamp = (v, max) => clampv(v, 0, max);
const norm = (s) => ({ x0: Math.min(s.x0, s.x1), y0: Math.min(s.y0, s.y1), x1: Math.max(s.x0, s.x1), y1: Math.max(s.y0, s.y1) });

function points(s) { return [
  ['nw', s.x0, s.y0], ['n', (s.x0 + s.x1 + 1) / 2, s.y0], ['ne', s.x1 + 1, s.y0],
  ['e', s.x1 + 1, (s.y0 + s.y1 + 1) / 2], ['se', s.x1 + 1, s.y1 + 1],
  ['s', (s.x0 + s.x1 + 1) / 2, s.y1 + 1], ['sw', s.x0, s.y1 + 1],
  ['w', s.x0, (s.y0 + s.y1 + 1) / 2],
]; }

function pointer(e) { const r = $('cv').getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }

function hit(e) { if (!S.sel || S.selFloat || !e) return null;
  const p = pointer(e), z = S.view.zoom, tol = Math.min(11, Math.max(4, z * 0.45));
  for (const [kind, x, y] of points(S.sel)) {
    const sx = S.view.ox + x * z, sy = S.view.oy + y * z;
    if (Math.hypot(p.sx - sx, p.sy - sy) <= tol) return kind; }
  return null;
}

function resizeMask(from, mask, to) {
  return resizeSelectionMask(mask, from, to, S.W, S.H);
}

function shiftMask(mask, dx, dy) {
  return shiftSelectionMask(mask, dx, dy, S.W, S.H);
}

function setSel(sel, mask) { S.sel = sel; S.selMask = mask; bus.emit('selection'); bus.emit('render'); }

function resize(gx, gy) { const k = drag.kind, a = drag.startSel; let s = { ...a };
  if (k.includes('w')) s.x0 = clamp(gx, S.W - 1); if (k.includes('e')) s.x1 = clamp(gx, S.W - 1);
  if (k.includes('n')) s.y0 = clamp(gy, S.H - 1); if (k.includes('s')) s.y1 = clamp(gy, S.H - 1);
  s = norm(s); setSel(s, resizeMask(drag.startSel, drag.startMask, s)); }

function move(gx, gy) { const a = drag.startSel, dx = gx - drag.gx, dy = gy - drag.gy;
  const w = a.x1 - a.x0, h = a.y1 - a.y0, x0 = clamp(a.x0 + dx, S.W - 1 - w), y0 = clamp(a.y0 + dy, S.H - 1 - h);
  const s = { x0, y0, x1: x0 + w, y1: y0 + h }; setSel(s, shiftMask(drag.startMask, x0 - a.x0, y0 - a.y0)); }

function down({ gx, gy, e }) {
  if (!S.sel || S.selFloat) return false; // ручки трансформируют область выделения (в т.ч. у лассо); рисование нового контура — клик вне выделения
  const kind = hit(e) || (selHit(gx, gy) ? 'move' : null);
  if (!kind) return false;
  drag = { kind, gx, gy, startSel: cloneSel(S.sel), startMask: cloneMask(S.selMask, S.sel) }; return true;
}

function cursor(kind) {
  if (kind === 'move') return 'move';
  if (kind === 'nw' || kind === 'se') return 'nwse-resize';
  if (kind === 'ne' || kind === 'sw') return 'nesw-resize';
  return kind === 'n' || kind === 's' ? 'ns-resize' : 'ew-resize';
}

registerGlobal({
  down,
  move: ({ gx, gy }) => { if (!drag) return; if (drag.kind === 'move') move(gx, gy); else resize(gx, gy); },
  up: () => { drag = null; },
  hover: ({ gx, gy, e }) => { if (!S.sel || S.selFloat) return null;
    const kind = hit(e) || (selHit(gx, gy) ? 'move' : null); return kind ? cursor(kind) : null; },
});

actions.register('selection.transform', () => toast(t('toast.transformSelectionHint')));
