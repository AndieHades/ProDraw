// Экранное взаимодействие трансформации: захват ручек, перетаскивание, рамка.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { C } from '../../styles/canvas-colors.js';
import { ROT_MIN_SCALE } from '../../config/limits.js';
import { rotFrame, rotCenter, rotWorldToLocal, rotState, rotHasChanges } from './math.js';

const cv = () => $('cv');
const rotScreen = (p) => ({ x: S.view.ox + p.x * S.view.zoom, y: S.view.oy + p.y * S.view.zoom });
const rotPointer = (e) => { const r = cv().getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top, x: (e.clientX - r.left - S.view.ox) / S.view.zoom, y: (e.clientY - r.top - S.view.oy) / S.view.zoom }; };

export function rotHit(e) { const m = S.rotMode, p = rotPointer(e), f = rotFrame(m), hit = 14;
  for (let i = 0; i < f.p.length; i++) { const s = rotScreen(f.p[i]); if (Math.hypot(p.sx - s.x, p.sy - s.y) <= hit) return { kind: 'corner', corner: i, p: f.p[i] }; }
  for (const side of f.sides) { const s = rotScreen(side.p); if (Math.hypot(p.sx - s.x, p.sy - s.y) <= hit) return side; }
  const q = rotWorldToLocal(m, p.x, p.y); if (q.x >= 0 && q.y >= 0 && q.x <= m.b.w && q.y <= m.b.h) return { kind: 'move' };
  return null; }

export function rotGrab({ e }) { const hit = rotHit(e); if (!hit) { S.rotMode.grab = null; return; }
  const p = rotPointer(e), c = rotCenter(S.rotMode), hp = hit.p || p;
  S.rotMode.grab = { ...hit, start: p, sx: S.rotMode.sx, sy: S.rotMode.sy, tx: S.rotMode.tx, ty: S.rotMode.ty, ang: S.rotMode.ang,
    cx: c.x, cy: c.y, a0: Math.atan2(p.y - c.y, p.x - c.x), r0: Math.max(1e-6, Math.hypot(hp.x - c.x, hp.y - c.y)), logged: false }; }

function dragAngle(g, p, e) {
  let a = g.ang + Math.atan2(p.y - g.cy, p.x - g.cx) - g.a0;
  if (e.shiftKey) a = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
  S.rotMode.ang = a;
}

function dragScale(g, p, e) {
  const k = Math.max(ROT_MIN_SCALE, Math.hypot(p.x - g.cx, p.y - g.cy) / g.r0);
  if (g.kind === 'corner') { S.rotMode.sx = Math.max(ROT_MIN_SCALE, g.sx * k); S.rotMode.sy = Math.max(ROT_MIN_SCALE, g.sy * k); }
  else if (g.kind === 'scale-x') { const nsx = Math.max(ROT_MIN_SCALE, g.sx * k); S.rotMode.sx = nsx;
    if (e.shiftKey && g.sx) S.rotMode.sy = Math.max(ROT_MIN_SCALE, g.sy * nsx / g.sx); }
  else if (g.kind === 'scale-y') { const nsy = Math.max(ROT_MIN_SCALE, g.sy * k); S.rotMode.sy = nsy;
    if (e.shiftKey && g.sy) S.rotMode.sx = Math.max(ROT_MIN_SCALE, g.sx * nsy / g.sy); }
}

export function rotDrag(e, rebuild) { const g = S.rotMode && S.rotMode.grab; if (!g) return; const p = rotPointer(e);
  if (!g.logged) { S.rotMode.hist.push(rotState(S.rotMode)); g.logged = true; }
  if (g.kind === 'move') { S.rotMode.tx = g.tx + p.x - g.start.x; S.rotMode.ty = g.ty + p.y - g.start.y; }
  else { dragAngle(g, p, e); dragScale(g, p, e); }
  S.rotMode.changed = rotHasChanges(S.rotMode); rebuild(); }

export function rotHover({ e }) { const h = rotHit(e);
  cv().style.cursor = !h ? '' : h.kind === 'move' ? 'move' : h.kind === 'corner' ? 'grab' : h.kind === 'scale-x' ? 'ew-resize' : 'ns-resize'; }

function strokeFrame(ctx, pts, dashed) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath(); ctx.setLineDash(dashed); ctx.stroke();
}

// Рамка трансформации статична: пунктир под синими кружками, без SVG ants-анимации.
export function drawTransformFrame(ctx) { if (!S.rotMode) return; const f = rotFrame(S.rotMode);
  const pts = f.p.map(rotScreen);
  ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.8)'; strokeFrame(ctx, pts, []);
  ctx.strokeStyle = C.fg; strokeFrame(ctx, pts, [6, 4]); ctx.restore();
  const dot = (p) => { const s = rotScreen(p); ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = C.accent; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.fg; ctx.stroke(); };
  for (const p of f.p) dot(p);
  for (const s of f.sides) dot(s.p); }
