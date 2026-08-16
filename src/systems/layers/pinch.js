// Щипок двумя пальцами по строкам слоёв сводит диапазон между ними в один.
// Пока сводишь — строки под пальцами чуть растут, промежуточные съезжаются к
// центру (живая отдача). Слияние срабатывает только если щипок доведён;
// неполный — строки отыгрывают назад. Сливаются слои под пальцами, не выбор.
import { $ } from '../../core/dom.js';
import { PINCH_MERGE } from '../../config/timings.js';
import { mergeRange } from './ops.js';

const pts = new Map();
let start = 0, group = null, rows = null, active = false;
export const pinchActive = () => active;

function rowAt(x, y) { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('#lay-list .lrow[data-li]') : null; }
function dist() { const v = [...pts.values()]; return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); }
function band(box, ya, yb) { const lo = Math.min(ya, yb) - 4, hi = Math.max(ya, yb) + 4;
  return [...box.querySelectorAll('.lrow[data-li]')].filter((r) => { const c = r.getBoundingClientRect(); const m = c.top + c.height / 2; return m >= lo && m <= hi; }); }

function preview(p) { if (!group || group.length < 2) return; const rc = group.map((r) => r.getBoundingClientRect());
  const cen = (rc[0].top + rc[0].height / 2 + rc[rc.length - 1].top + rc[rc.length - 1].height / 2) / 2;
  group.forEach((r, i) => { r.style.transition = 'none'; const m = rc[i].top + rc[i].height / 2;
    if (i === 0 || i === group.length - 1) r.style.transform = `scale(${1 + 0.06 * p})`; // под пальцами — чуть крупнее
    else { r.style.transform = `translateY(${(cen - m) * p}px) scale(${1 - 0.06 * p})`; r.style.opacity = String(1 - 0.55 * p); } });
}
function clearPreview(snap) { if (!group) return; const g = group; group = null;
  for (const r of g) { r.style.transition = snap ? 'transform .16s, opacity .16s' : 'none'; r.style.transform = ''; r.style.opacity = ''; }
  if (snap) setTimeout(() => { for (const r of g) r.style.transition = ''; }, 180); }

export function mountPinch() { const box = $('lay-list'); if (!box) return;
  box.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { active = true; start = dist(); const v = [...pts.values()]; const ra = rowAt(v[0].x, v[0].y), rb = rowAt(v[1].x, v[1].y);
      rows = (ra && rb && ra !== rb) ? [+ra.dataset.li, +rb.dataset.li] : null; group = rows ? band(box, v[0].y, v[1].y) : null; } });
  box.addEventListener('pointermove', (e) => { const p2 = pts.get(e.pointerId); if (!p2) return; p2.x = e.clientX; p2.y = e.clientY;
    if (pts.size === 2 && group && start > 40) preview(Math.max(0, Math.min(1, (start - dist()) / (start * (1 - PINCH_MERGE))))); });
  box.addEventListener('pointerup', (e) => { const had = active && rows, full = had && start > 40 && dist() < start * PINCH_MERGE;
    pts.delete(e.pointerId);
    if (had && pts.size < 2) { if (full) { clearPreview(false); mergeRange(rows[0], rows[1]); } else clearPreview(true); rows = null; }
    if (pts.size < 2) active = false; });
  box.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (pts.size < 2) { clearPreview(true); active = false; rows = null; } });
}
