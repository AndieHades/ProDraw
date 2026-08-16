// Система ввода: мышь/перо и колесо на холсте. Диспетчеризует указатель в
// обработчики инструментов/режимов (core/canvas-handlers), пан правой кнопкой,
// зум колесом, Alt — пипетка. Тач-жесты — в ./gestures.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { selHit } from '../../core/selection.js';
import { toolHandler, modeHandler, globalHandlers } from '../../core/canvas-handlers.js';
import { gridAt } from '../../core/viewport.js';
import { STABILIZE, DRAG_THRESHOLD } from '../../config/timings.js';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.js';
import { CURSOR_TOOLS } from '../../config/cursor.js';
import { mountGestures } from './gestures.js';

const cv = () => $('cv');
export const toGrid = (e) => gridAt(e.clientX, e.clientY);
const activeMode = () => (S.cropMode ? modeHandler('crop') : S.rotMode ? modeHandler('transform') : null);
const capture = (id) => { try { cv().setPointerCapture(id); } catch (e) {} };
const inWorkArea = (gx, gy) => (S.tile && S.tile.on)
  ? gx >= -S.W && gy >= -S.H && gx < 2 * S.W && gy < 2 * S.H
  : gx >= 0 && gy >= 0 && gx < S.W && gy < S.H;
const startPan = (e) => {
  rdrag = { x: e.clientX, y: e.clientY, ox: S.view.ox, oy: S.view.oy, moved: false, btn: e.button };
};

let rdrag = null, drawing = false, stabPt = null, activeGlobal = null;
function smooth(e) { if (!S.stabOn) return [e.clientX, e.clientY];
  if (!stabPt) { stabPt = { x: e.clientX, y: e.clientY }; return [e.clientX, e.clientY]; }
  stabPt.x += (e.clientX - stabPt.x) * STABILIZE; stabPt.y += (e.clientY - stabPt.y) * STABILIZE; return [stabPt.x, stabPt.y]; }

export function down(e) { if (e.pointerId != null) capture(e.pointerId);
  if (e.pointerType === 'mouse' && e.button === 2 && S.rotMode) { bus.emit('transform-menu', e); return; }
  const [gx, gy] = toGrid(e);
  if (e.pointerType === 'mouse' && !S.cropMode && !S.rotMode
      && (e.button === 1 || e.button === 2 || (e.button === 0 && !inWorkArea(gx, gy)))) {
    startPan(e); return; }
  if (e.pointerType === 'mouse' && e.button && !(S.cropMode && e.button === 2)) return;
  stabPt = { x: e.clientX, y: e.clientY };
  const m = activeMode(); if (m) { m.down({ gx, gy, e }); drawing = true; return; }
  for (const gh of globalHandlers()) if (gh.down && gh.down({ gx, gy, e })) { activeGlobal = gh; drawing = true; return; }
  if (S.sel && S.tool !== 'select' && S.tool !== 'lasso' && !selHit(gx, gy)) { actions.run('select.none'); return; } // лассо строит контур поверх существующего выделения (add/subtract/intersect)
  const h = toolHandler(S.tool); if (h && h.down) { h.down({ gx, gy, e }); drawing = true; }
}

export function move(e) {
  if (e.pointerType !== 'touch') { const [hx, hy] = toGrid(e); // в Tile Mode курсор виден над всем блоком 3×3
    const over = inWorkArea(hx, hy);
    S.hoverPx = over ? [hx, hy] : null;
    // под кистью прячем нативный crosshair — наводку рисует Brush Cursor Renderer (прицел + отпечаток)
    let cur = over ? (S.eyedrop.active || CURSOR_TOOLS.includes(S.tool) ? 'none' : 'crosshair') : 'default'; // инструмент может подсказать курсор (ручки выделения и т.п.)
    const ht = toolHandler(S.tool), gh = globalHandlers().map((h) => h.hover && h.hover({ gx: hx, gy: hy, e })).find(Boolean);
    if (!S.eyedrop.active && !drawing && !rdrag && !activeMode()) { if (gh) cur = gh; else if (ht && ht.hover) { const c2 = ht.hover({ gx: hx, gy: hy, e }); if (c2) cur = c2; } }
    cv().style.cursor = cur; }
  if (rdrag) { const dx = e.clientX - rdrag.x, dy = e.clientY - rdrag.y; if (Math.hypot(dx, dy) > DRAG_THRESHOLD) rdrag.moved = true;
    if (rdrag.moved) { S.view.ox = rdrag.ox + dx; S.view.oy = rdrag.oy + dy; bus.emit('render'); } return; }
  if (activeGlobal) { const [gx, gy] = toGrid(e); if (activeGlobal.move) activeGlobal.move({ gx, gy, e }); return; }
  const m = activeMode();
  if (m) { const [gx, gy] = toGrid(e); if (drawing) m.move({ gx, gy, e }); else if (m.hover) m.hover({ gx, gy, e }); return; }
  const h = toolHandler(S.tool);
  if (drawing && h && h.move) { const [sx, sy] = smooth(e); const r = cv().getBoundingClientRect();
    h.move({ gx: Math.floor((sx - r.left - S.view.ox) / S.view.zoom), gy: Math.floor((sy - r.top - S.view.oy) / S.view.zoom), e }); }
  else if (e.pointerType !== 'touch') bus.emit('render'); // перерисовка контура кисти
}

export function up(e) {
  if (e && e.pointerId != null) { try { cv().releasePointerCapture(e.pointerId); } catch (er) {} }
  if (rdrag) { if (e && !rdrag.moved && rdrag.btn === 2) // на Tilemap ПКМ вызывает меню клетки (не перехватывается выделением)
    bus.emit(!(S.tileset && S.tileset.on) && S.sel && !S.selFloat ? 'selection-menu' : 'canvas-menu', e); rdrag = null; return; }
  if (activeGlobal) { if (activeGlobal.up) activeGlobal.up({ e }); activeGlobal = null; drawing = false; return; }
  stabPt = null;
  const m = activeMode(); if (m) { if (drawing && m.up) m.up({ e }); drawing = false; return; }
  const h = toolHandler(S.tool); if (drawing && h && h.up) h.up({ e }); drawing = false;
}

export function mount() {
  const c = cv();
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  c.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') down(e); });
  c.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') move(e); });
  c.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') up(e); });
  c.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') up(e); });
  const endStroke = () => { if (drawing || rdrag) up(); }; // скриншот/alt-tab крадут pointerup — не оставляем слой «висеть» на курсоре
  window.addEventListener('blur', endStroke);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endStroke(); });
  c.addEventListener('pointerleave', () => { if (S.hoverPx) { S.hoverPx = null; bus.emit('render'); } });
  window.addEventListener('pointermove', (e) => { if (S.hoverPx && e.target !== c) { S.hoverPx = null; bus.emit('render'); } }); // курсор кисти виден только над холстом
  c.addEventListener('wheel', (e) => { e.preventDefault(); const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - S.view.ox) / S.view.zoom, wy = (my - S.view.oy) / S.view.zoom;
    S.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.view.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    S.view.ox = mx - wx * S.view.zoom; S.view.oy = my - wy * S.view.zoom; bus.emit('render'); }, { passive: false });
  mountGestures(c, { toGrid, down, move, up });
}
