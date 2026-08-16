// ПКМ-удержание с протяжкой по строкам (десктоп) → множественный выбор строк
// панели: слои, папки, эффекты/настройки. Короткое ПКМ без движения остаётся
// контекст-меню (его подавляем только если была протяжка). Строки помечаем сразу
// классом, состояние пишем на отпускании.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { squelchContextMenu } from '../../core/long-press.js';

export function rmbSweep(e, el) {
  try { el.setPointerCapture(e.pointerId); } catch (err) {}
  let moved = false; const layers = new Set(), folders = new Set(), effects = new Set();
  const add = (row) => { if (!row) return;
    if (row.dataset.li != null) { layers.add(+row.dataset.li); row.classList.add('marked'); }
    else if (row.dataset.fid != null) { folders.add(+row.dataset.fid); row.classList.add('marked'); }
    else if (row.__eff) { effects.add(row.__eff); row.classList.add('marked'); } }; // эффекты/настройки тоже
  add(el);
  const move = (ev) => { if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6) moved = true;
    const t = document.elementFromPoint(ev.clientX, ev.clientY); add(t && t.closest ? t.closest('#lay-list .lrow, #lay-list .fxrow') : null); };
  const up = () => {
    el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
    if (!moved) return; // без протяжки — обычное контекст-меню
    squelchContextMenu(); S.bgSel = false;
    const li = [...layers].sort((a, b) => a - b);
    if (li.length) S.cur = li[li.length - 1];
    S.markedFolders = folders; S.fxSel = effects;
    // primary (синяя строка) один: эффект → папка → слой; остальное помечается marked
    if (effects.size) { S.fxCur = [...effects][0]; S.selFolder = null; S.marked = new Set(li); }
    else if (folders.size) { S.selFolder = [...folders][0]; S.fxCur = null; S.marked = new Set(li); }
    else { S.selFolder = null; S.fxCur = null; S.marked = new Set(li.slice(0, -1)); }
    bus.emit('layers');
  };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
