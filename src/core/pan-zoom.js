// Пан/зум холста-вьюпорта: перетаскивание, щипок двумя пальцами, колесо.
// Один помощник на окна превью и референса (view = {z, x, y}).
export function attachPanZoom(canvas, view, { min = 0.1, max = 40, render, onPick }) {
  const pp = new Map(); let p = null, pinch0 = null;
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pp.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pp.size === 2) { const a = [...pp.values()]; pinch0 = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: view.z }; p = null; return; }
    p = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!pp.has(e.pointerId)) { if (e.buttons === 0) return; }
    pp.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pp.size >= 2 && pinch0) { const a = [...pp.values()], dd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      const mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }, r = canvas.getBoundingClientRect();
      const wx = (mid.x - r.left - view.x) / view.z, wy = (mid.y - r.top - view.y) / view.z;
      view.z = Math.max(min, Math.min(max, pinch0.z * (dd / pinch0.d)));
      view.x = (mid.x - r.left) - wx * view.z; view.y = (mid.y - r.top) - wy * view.z; render(); return; }
    if (!p) return; if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) p.moved = true;
    if (p.moved) { view.x = p.vx + (e.clientX - p.x); view.y = p.vy + (e.clientY - p.y); render(); } });
  const end = (e) => { pp.delete(e.pointerId); if (pp.size < 2) pinch0 = null;
    if (p && !p.moved && onPick) onPick(e); p = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - view.x) / view.z, wy = (my - view.y) / view.z;
    view.z = Math.max(min, Math.min(max, view.z * (e.deltaY < 0 ? 1.12 : 0.89)));
    view.x = mx - wx * view.z; view.y = my - wy * view.z; render(); }, { passive: false });
}
