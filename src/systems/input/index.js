// Система ввода: мышь/перо и колесо на холсте. Диспетчеризует указатель в
// обработчики инструментов/режимов (core/canvas-handlers), пан правой кнопкой,
// зум колесом, Alt — пипетка. Тач-жесты — в ./gestures.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $ } from '../../ui/dom/ShellDom.ts';
import { selHit } from '../../core/selection.js';
import { toolHandler, modeHandler, globalHandlers } from '../../core/canvas-handlers.ts';
import { canvasAt, gridAt } from '../../core/viewport.js';
import { DRAG_THRESHOLD } from '../../config/timings.ts';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.ts';
import { mountGestures } from './gestures.js';

const cv = () => $('cv');
export const toGrid = (e) => gridAt(e.clientX, e.clientY);
export const toCanvas = (e) => canvasAt(e.clientX, e.clientY);
const activeMode = () => (S.cropMode ? modeHandler('crop') : S.rotMode ? modeHandler('transform') : null);
const capture = (id) => { try { cv().setPointerCapture(id); } catch (e) {} };
const inWorkArea = (gx, gy) => (S.tile && S.tile.on)
  ? gx >= -S.W && gy >= -S.H && gx < 2 * S.W && gy < 2 * S.H
  : gx >= 0 && gy >= 0 && gx < S.W && gy < S.H;
const startPan = (e) => {
  rdrag = { x: e.clientX, y: e.clientY, ox: S.view.ox, oy: S.view.oy, moved: false, btn: e.button };
};

let rdrag = null, drawing = false, activeGlobal = null;
let activePointerId = null;
function releaseCapture(e) { const id = e?.pointerId ?? activePointerId;
  if (id == null || (activePointerId != null && id !== activePointerId)) return;
  activePointerId = null; try { cv().releasePointerCapture(id); } catch (error) {} }
export function down(e) {
  if (e.pointerId != null) { activePointerId = e.pointerId; capture(e.pointerId); }
  const [rx, ry] = toCanvas(e), gx = Math.floor(rx), gy = Math.floor(ry);
  const m = activeMode(), modeHit = m?.hit?.({ gx, gy, rx, ry, e });
  if (e.pointerType === 'mouse' && e.button === 2 && S.rotMode && modeHit) {
    bus.emit('transform-menu', e); return; }
  if (e.pointerType === 'mouse' && !S.cropMode && (e.button === 1 || e.button === 2 ||
      (e.button === 0 && (!inWorkArea(gx, gy) || (S.rotMode && !modeHit))))) {
    startPan(e); return; }
  if (e.pointerType === 'mouse' && e.button && !(S.cropMode && e.button === 2)) return;
  if (m) { m.down({ gx, gy, rx, ry, e }); drawing = true; return; }
  for (const gh of globalHandlers()) if (gh.down && gh.down({ gx, gy, rx, ry, e })) { activeGlobal = gh; drawing = true; return; }
  if (S.sel && S.tool !== 'select' && S.tool !== 'lasso' && !selHit(gx, gy)) { actions.run('select.none'); return; } // лассо строит контур поверх существующего выделения (add/subtract/intersect)
  const h = toolHandler(S.tool); if (h && h.down) { h.down({ gx, gy, rx, ry, e }); drawing = true; }
}

export function move(e) {
  if (e.pointerType !== 'touch') { const [hx, hy] = toGrid(e); // в Tile Mode курсор виден над всем блоком 3×3
    const over = inWorkArea(hx, hy);
    S.hoverPx = over ? [hx, hy] : null;
    let cur = over && S.eyedrop.active ? 'none' : over ? 'crosshair' : 'default';
    const ht = toolHandler(S.tool), gh = globalHandlers().map((h) => h.hover && h.hover({ gx: hx, gy: hy, e })).find(Boolean);
    if (!S.eyedrop.active && !drawing && !rdrag && !activeMode()) { if (gh) cur = gh; else if (ht && ht.hover) { const c2 = ht.hover({ gx: hx, gy: hy, e }); if (c2) cur = c2; } }
    cv().style.cursor = cur; }
  if (rdrag) { const dx = e.clientX - rdrag.x, dy = e.clientY - rdrag.y; if (Math.hypot(dx, dy) > DRAG_THRESHOLD) rdrag.moved = true;
    if (rdrag.moved) { S.view.ox = rdrag.ox + dx; S.view.oy = rdrag.oy + dy; bus.emit('render'); } return; }
  if (activeGlobal) { const [gx, gy] = toGrid(e); if (activeGlobal.move) activeGlobal.move({ gx, gy, e }); return; }
  const m = activeMode();
  if (m) { const [gx, gy] = toGrid(e); if (drawing) m.move({ gx, gy, e }); else if (m.hover) m.hover({ gx, gy, e }); return; }
  const h = toolHandler(S.tool);
  if (drawing && h && h.move) { const r = cv().getBoundingClientRect();
    const rx = (e.clientX - r.left - S.view.ox) / S.view.zoom;
    const ry = (e.clientY - r.top - S.view.oy) / S.view.zoom;
    h.move({ gx: Math.floor(rx), gy: Math.floor(ry), rx, ry, e }); }
  else if (e.pointerType !== 'touch') bus.emit('render'); // перерисовка контура кисти
}

export function up(e) { try {
  if (rdrag) { if (e && !rdrag.moved && rdrag.btn === 2)
    bus.emit(S.sel && !S.selFloat ? 'selection-menu' : 'canvas-menu', e);
    rdrag = null; return; }
  if (activeGlobal) { if (activeGlobal.up) activeGlobal.up({ e }); activeGlobal = null; drawing = false; return; }
  const m = activeMode(); if (m) { if (drawing && m.up) m.up({ e }); drawing = false; return; }
  const h = toolHandler(S.tool); if (drawing && h && h.up) h.up({ e }); drawing = false;
  } finally { releaseCapture(e); }
}

export function cancel(e) {
  const wasDrawing = drawing, owner = activeGlobal || activeMode() || toolHandler(S.tool);
  drawing = false; activeGlobal = null; rdrag = null;
  try { if (wasDrawing && owner?.cancel) owner.cancel({ e }); }
  finally { releaseCapture(e); bus.emit('render'); }
}

export function mount() {
  const c = cv();
  bus.on('document-transition', () => {
    if (drawing || rdrag || activePointerId != null) cancel();
  });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  c.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') down(e); });
  c.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') move(e); });
  c.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') up(e); });
  c.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') cancel(e); });
  c.addEventListener('lostpointercapture', (e) => { if (e.pointerType !== 'touch') cancel(e); });
  window.addEventListener('blur', () => { if (drawing || rdrag || activePointerId != null) cancel(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden &&
    (drawing || rdrag || activePointerId != null)) cancel(); });
  c.addEventListener('pointerleave', () => { if (S.hoverPx) { S.hoverPx = null; bus.emit('render'); } });
  window.addEventListener('pointermove', (e) => { if (S.hoverPx && e.target !== c) { S.hoverPx = null; bus.emit('render'); } }); // курсор кисти виден только над холстом
  c.addEventListener('wheel', (e) => { e.preventDefault(); const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - S.view.ox) / S.view.zoom, wy = (my - S.view.oy) / S.view.zoom;
    S.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.view.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    S.view.ox = mx - wx * S.view.zoom; S.view.oy = my - wy * S.view.zoom; bus.emit('render'); }, { passive: false });
  mountGestures(c, { toGrid, down, move, up });
}
