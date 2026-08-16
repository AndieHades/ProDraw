// Тач-жесты: 1 палец — рисование/тап; 2 пальца — зум/панорама или тап-отмена;
// 3 пальца — повтор. Делегирует down/move/up системе ввода. Пипетка на тач —
// через единую Eyedropper System (удержание кнопки bb-pick), здесь её нет.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { doUndo, doRedo } from '../../core/history.js';
import { TAP_MAX_MS, DRAG_THRESHOLD, PINCH_MIN } from '../../config/timings.js';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.js';

export function mountGestures(cv, io) {
  const ptrs = new Map(); let pinch = null, gMaxN = 0, gMoved = false, gT0 = 0, gx0 = 0, gy0 = 0, drawing = false;
  const pts = () => [...ptrs.values()];
  function startPinch() { const p = pts(), mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), r = cv.getBoundingClientRect();
    pinch = { d, zoom: S.view.zoom, wx: (mid.x - r.left - S.view.ox) / S.view.zoom, wy: (mid.y - r.top - S.view.oy) / S.view.zoom, mx: mid.x, my: mid.y }; }
  function doPinch() { if (!pinch) { startPinch(); return; } const p = pts(), mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), r = cv.getBoundingClientRect();
    if (Math.abs(d - pinch.d) > PINCH_MIN || Math.hypot(mid.x - pinch.mx, mid.y - pinch.my) > PINCH_MIN) gMoved = true;
    S.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinch.zoom * (d / pinch.d)));
    S.view.ox = (mid.x - r.left) - pinch.wx * S.view.zoom; S.view.oy = (mid.y - r.top) - pinch.wy * S.view.zoom; bus.emit('render'); }

  cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); gMaxN = Math.max(gMaxN, ptrs.size);
    if (ptrs.size === 1) { gT0 = performance.now(); gMoved = false; gx0 = e.clientX; gy0 = e.clientY; }
    else if (ptrs.size === 2) { if (drawing) { io.up({ pointerType: 'touch' }); drawing = false; } startPinch(); } });

  cv.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2) { doPinch(); return; }
    if (Math.hypot(e.clientX - gx0, e.clientY - gy0) > DRAG_THRESHOLD) gMoved = true;
    if (gMoved) { if (!drawing) { io.down({ clientX: gx0, clientY: gy0, pointerType: 'touch' }); drawing = true; } io.move({ clientX: e.clientX, clientY: e.clientY, pointerType: 'touch' }); } });

  const end = (e) => { if (e.pointerType !== 'touch' || !ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size > 0) { if (ptrs.size < 2) pinch = null; return; }
    const dur = performance.now() - gT0;
    if (drawing) { io.up({ pointerType: 'touch' }); drawing = false; }
    else if (!gMoved && dur < TAP_MAX_MS) { const nn = gMaxN;
      if (nn <= 1) { io.down({ clientX: gx0, clientY: gy0, pointerType: 'touch' }); io.up({ pointerType: 'touch' }); }
      else if (nn === 2) doUndo(); else if (nn >= 3) doRedo(); }
    gMaxN = 0; gMoved = false; pinch = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
