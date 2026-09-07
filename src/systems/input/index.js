// Система ввода: мышь/перо и колесо на холсте. Диспетчеризует указатель в
// обработчики инструментов/режимов (core/canvas-handlers), пан правой кнопкой,
// зум колесом, Alt — пипетка. Тач-жесты — в ./gestures.js.
import { S } from '../../core/state.ts';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $ } from '../../core/shell.ts';
import { selHit } from '../../core/selection.ts';
import { toolHandler, modeHandler, globalHandlers } from '../../core/canvas-handlers.ts';
import { canvasAt, canvasBounds, gridAt, holdCanvasBounds,
  releaseCanvasBounds } from '../../core/viewport.ts';
import { DRAG_THRESHOLD } from '../../config/timings.ts';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.ts';
import { canvasPanModifierHeld } from '../../core/navigationModifiers.ts';
import { shouldStartCanvasPan } from '../../logic/view/CanvasPanPolicy.ts';
import { CanvasPanSession } from '../viewport/CanvasPanSession.ts';
import { zoomLegacyViewAt } from '../../logic/view/LegacyViewGeometry.ts';
import { actualPointerEvents } from '../../core/input/actualPointerEvents.ts';
import { strokeSampleFromPointer } from '../../logic/input/strokeSampleFromPointer.ts';
import { POINTER_INPUT } from '../../config/pointer.ts';
import { mountGestures } from './gestures.js';
import { isInsideTileWorkArea } from '../../logic/TileGeometry.ts';

const cv = () => $('cv');
// Инструмент получает нормализованный сэмпл: давление и наклон пера доходят
// до него, а мышь и палец получают предсказуемый fallback из config.
const sampleAt = (rx, ry, source) =>
  strokeSampleFromPointer(rx, ry, source, POINTER_INPUT);
export const toGrid = (e) => gridAt(e.clientX, e.clientY);
export const toCanvas = (e) => canvasAt(e.clientX, e.clientY);
const activeMode = () => (S.cropMode ? modeHandler('crop') : S.rotMode ? modeHandler('transform') : null);
const capture = (id) => { try { cv().setPointerCapture(id); } catch (e) {} };
const inWorkArea = (gx, gy) =>
  isInsideTileWorkArea(gx, gy, S.W, S.H, !!(S.tile && S.tile.on));
const pan = new CanvasPanSession(DRAG_THRESHOLD);
let drawing = false, activeGlobal = null;
let activePointerId = null;
// Курсор пишется только при смене значения: раньше стиль трогали на каждом
// событии движения. Прямоугольник холста кеширует core/viewport на время жеста.
let appliedCursor = null;
export const forgetCanvasBounds = () => releaseCanvasBounds();
function applyCursor(value) {
  if (value === appliedCursor) return;
  appliedCursor = value; cv().style.cursor = value;
}

function updateHover(e) {
  const [hx, hy] = toGrid(e); // в Tile Mode курсор виден над всем блоком 3×3
  const over = inWorkArea(hx, hy);
  S.hoverPx = over ? [hx, hy] : null;
  let cur = over && S.eyedrop.active ? 'none' : over ? 'crosshair' : 'default';
  let handled = null; // hover глобальных обработчиков имеет побочные эффекты
  for (const handler of globalHandlers()) {
    const value = handler.hover && handler.hover({ gx: hx, gy: hy, e });
    if (value && !handled) handled = value;
  }
  if (!S.eyedrop.active && !drawing && !pan.active && !activeMode()) {
    if (handled) cur = handled;
    else { const tool = toolHandler(S.tool);
      const value = tool && tool.hover && tool.hover({ gx: hx, gy: hy, e });
      if (value) cur = value; }
  }
  applyCursor(cur);
}
function releaseCapture(e) { const id = e?.pointerId ?? activePointerId;
  if (id == null || (activePointerId != null && id !== activePointerId)) return;
  activePointerId = null; try { cv().releasePointerCapture(id); } catch (error) {} }
export function down(e) {
  holdCanvasBounds();
  if (e.pointerId != null) { activePointerId = e.pointerId; capture(e.pointerId); }
  const [rx, ry] = toCanvas(e), gx = Math.floor(rx), gy = Math.floor(ry);
  const m = activeMode(), modeHit = m?.hit?.({ gx, gy, rx, ry, e });
  if (e.pointerType === 'mouse' && e.button === 2 && S.rotMode && modeHit) {
    bus.emit('transform-menu', e); return; }
  if (shouldStartCanvasPan(e, { modifierHeld: canvasPanModifierHeld(),
    modeActive: !!m, modeHit: !!modeHit, insideWorkArea: inWorkArea(gx, gy) })) {
    pan.begin(e, S.view); return; }
  if (e.pointerType === 'mouse' && e.button && !(S.cropMode && e.button === 2)) return;
  if (m) { m.down({ gx, gy, rx, ry, e }); drawing = true; return; }
  for (const gh of globalHandlers()) if (gh.down && gh.down({ gx, gy, rx, ry, e })) { activeGlobal = gh; drawing = true; return; }
  if (S.sel && S.tool !== 'select' && S.tool !== 'lasso' && !selHit(gx, gy)) { actions.run('select.none'); return; } // лассо строит контур поверх существующего выделения (add/subtract/intersect)
  const h = toolHandler(S.tool); if (h && h.down) {
    h.down({ gx, gy, rx, ry, e, sample: sampleAt(rx, ry, e) }); drawing = true; }
}

export function move(e) {
  if (e.pointerType !== 'touch') updateHover(e);
  if (pan.active) { const next = pan.move(e);
    if (next?.moved) { S.view.ox = next.ox; S.view.oy = next.oy; bus.emit('render'); }
    return; }
  if (activeGlobal) { const [gx, gy] = toGrid(e); if (activeGlobal.move) activeGlobal.move({ gx, gy, e }); return; }
  const m = activeMode();
  if (m) { const [gx, gy] = toGrid(e); if (drawing) m.move({ gx, gy, e }); else if (m.hover) m.hover({ gx, gy, e }); return; }
  const h = toolHandler(S.tool);
  // Перо отдаёт несколько сэмплов на кадр; раньше все, кроме последнего,
  // терялись и штрих собирался из длинных интерполированных отрезков.
  if (drawing && h && h.move) { const r = canvasBounds();
    for (const sample of actualPointerEvents(e)) {
      const rx = (sample.clientX - r.left - S.view.ox) / S.view.zoom;
      const ry = (sample.clientY - r.top - S.view.oy) / S.view.zoom;
      h.move({ gx: Math.floor(rx), gy: Math.floor(ry), rx, ry, e: sample,
        sample: sampleAt(rx, ry, sample) });
    } }
  else if (e.pointerType !== 'touch') bus.emit('render'); // перерисовка контура кисти
}

export function up(e) { try {
  if (pan.active) { const result = pan.finish(); if (e && !result?.moved && result?.button === 2)
    bus.emit(S.sel && !S.selFloat ? 'selection-menu' : 'canvas-menu', e);
    return; }
  if (activeGlobal) { if (activeGlobal.up) activeGlobal.up({ e }); activeGlobal = null; drawing = false; return; }
  const m = activeMode(); if (m) { if (drawing && m.up) m.up({ e }); drawing = false; return; }
  const h = toolHandler(S.tool); if (drawing && h && h.up) h.up({ e }); drawing = false;
  } finally { releaseCapture(e); releaseCanvasBounds(); }
}

export function cancel(e) {
  const wasDrawing = drawing, owner = activeGlobal || activeMode() || toolHandler(S.tool);
  drawing = false; activeGlobal = null; pan.cancel();
  try { if (wasDrawing && owner?.cancel) owner.cancel({ e }); }
  finally { releaseCapture(e); releaseCanvasBounds(); bus.emit('render'); }
}

// Прерывание не равно отмене: потеря фокуса окна или захвата указателя не
// стирает нарисованное — ход завершается так же, как по отпусканию пера.
// Отменяет ход только сам указатель (`pointercancel`) и смена документа.
export function interrupt(e) {
  if (!drawing && !pan.active && activePointerId == null) return;
  if (!drawing || pan.active) { cancel(e); return; }
  up(e); bus.emit('render');
}

export function mount() {
  const c = cv();
  bus.on('document-transition', () => {
    if (drawing || pan.active || activePointerId != null) cancel();
  });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  c.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') down(e); });
  c.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') move(e); });
  c.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') up(e); });
  c.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') cancel(e); });
  c.addEventListener('lostpointercapture', (e) => { if (e.pointerType !== 'touch') interrupt(e); });
  window.addEventListener('resize', releaseCanvasBounds);
  window.addEventListener('blur', () => interrupt());
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  c.addEventListener('pointerleave', () => { if (S.hoverPx) { S.hoverPx = null; bus.emit('render'); } });
  window.addEventListener('pointermove', (e) => { if (S.hoverPx && e.target !== c) { S.hoverPx = null; bus.emit('render'); } }); // курсор кисти виден только над холстом
  c.addEventListener('wheel', (e) => { e.preventDefault(); const r = c.getBoundingClientRect();
    Object.assign(S.view, zoomLegacyViewAt(S.view,
      { x: e.clientX - r.left, y: e.clientY - r.top }, e.deltaY < 0 ? 1.1 : 0.9,
      ZOOM_MIN, ZOOM_MAX)); bus.emit('render'); }, { passive: false });
  mountGestures(c, { toGrid, down, move, up });
}
