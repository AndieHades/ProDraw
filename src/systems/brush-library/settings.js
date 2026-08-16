// Окно настроек активной кисти (перетаскиваемое): режим (штамп/разброс/поток),
// размер, расстояние, разброс; превью мазка, тест-канвас и действия
// (Переименовать/Дублировать/Удалить). Открывается ПКМ/долгим нажатием по кисти.
// Параметры — на кисть (сохраняются), размер — общий инструмента.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $ } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { saveBrushPrefs } from '../../core/brush-prefs.js';
import { BP_SMAX } from '../../config/limits.js';
import { BRUSH_SETTINGS } from '../../config/brush-import.js';
import { brushMode, stampSize } from '../../logic/brush-stamp.js';
import { previewStroke } from '../../logic/brush-preview.js';
import { fillMask } from '../../core/canvas.js';
import { lib } from './data.js';
import { saveBrush } from '../../core/brush-store.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { initTestCanvas, clearTest } from './test-canvas.js';

let getMode = () => 'pencil', act = {};
const activeRec = () => { const sb = S.stampBrush[getMode()]; return sb ? lib.brushes.find((b) => b.id === sb.id) : null; };
const close = () => $('brush-settings').classList.remove('on');

function drawPreview() { const rec = activeRec(), cv = $('bs-preview'), W = 196, H = 44; cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.clearRect(0, 0, W, H); if (!rec) return;
  const size = Math.max(2, Math.min(H - 4, stampSize(rec, S.brushes[getMode()].size, BP_SMAX)));
  const pr = previewStroke(rec, W, H, size), c = S.active, img = cx.createImageData(W, H);
  fillMask(img.data, pr.data, W, H, [c[0], c[1], c[2], 255]);
  cx.putImageData(img, 0, 0); }
function syncModes() { const rec = activeRec(), mode = rec ? brushMode(rec.params) : 'flow';
  for (const b of $('bs-mode').children) b.classList.toggle('on', b.dataset.mode === mode); }
function apply() { const rec = activeRec(); if (rec) { saveBrush(rec); setStampBrush(getMode(), rec); } bus.emit('render'); syncSettings(); clearTest(); }
const editParam = (patch) => { const rec = activeRec(); if (!rec) return; rec.params = { ...rec.params, ...patch }; apply(); };

export function mountSettings(modeFn, actions) {
  getMode = modeFn; act = actions || {};
  $('bs-size').max = BP_SMAX; $('bs-spacing').max = BRUSH_SETTINGS.spacingMax; $('bs-scatter').max = BRUSH_SETTINGS.jitterMax;
  $('bs-size').addEventListener('input', () => { S.brushes[getMode()].size = +$('bs-size').value; saveBrushPrefs(S); bus.emit('brushlib'); bus.emit('render'); syncSettings(); clearTest(); });
  $('bs-spacing').addEventListener('input', () => editParam({ spacing: +$('bs-spacing').value }));
  $('bs-scatter').addEventListener('input', () => { const v = +$('bs-scatter').value; editParam({ jitter: v, sizeJitter: Math.min(0.85, v / BRUSH_SETTINGS.jitterMax) }); });
  for (const b of $('bs-mode').children) b.addEventListener('click', () => editParam({ mode: b.dataset.mode }));
  $('bs-rename').onclick = () => { const r = activeRec(); if (r && act.rename) act.rename(r.id); };
  $('bs-dup').onclick = () => { const r = activeRec(); if (r && act.dup) act.dup(r); };
  $('bs-del').onclick = () => { const r = activeRec(); if (r && act.del) { act.del(r); close(); } };
  initTestCanvas(getMode);
  floatingWindow($('brush-settings'), { grip: $('brush-set-head'), storeKey: 'brushsetwin', minW: 220, minH: 160, avoidOverlap: false, onClose: close });
}

export function openSettings() { if (activeRec()) { $('brush-settings').classList.add('on'); syncSettings(); clearTest(); } }
export function syncSettings() { const rec = activeRec();
  if (!rec) { close(); return; }
  $('bs-name').textContent = rec.name;
  $('bs-size').value = S.brushes[getMode()].size; $('bs-size-v').textContent = $('bs-size').value;
  $('bs-spacing').value = (rec.params && rec.params.spacing) || 0; $('bs-spacing-v').textContent = (+$('bs-spacing').value).toFixed(1);
  $('bs-scatter').value = (rec.params && rec.params.jitter) || 0; $('bs-scatter-v').textContent = (+$('bs-scatter').value).toFixed(1);
  syncModes(); drawPreview();
}
