// Перетаскивание строк панели слоёв (жест): призрак, зазор, drop-into. Данные
// переносят lay-drop.js (слои/папки) и fx-drag.js (эффекты); ПКМ-протяжка — rmb-sweep.js.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { dropZone, makeDropGap } from '../../core/drop-gap.js';
import { DROP_GAP_HOLD_MS } from '../../config/drag-drop.js';
import { setSquelch } from './list.js';
import { pinchActive } from './pinch.js';
import { fxDrop, fxBlock } from './fx-drag.js';
import { dragBlock, canIntoFolder, layDrop } from './lay-drop.js';
import { rmbSweep } from './rmb-sweep.js';
import { FOLDER_HOLD_MS, LIFT_MS } from '../../config/timings.js';

// взят ли элемент уже в выделение — тогда тащим весь набор, не сбрасывая выбор
function inSelection(info) {
  if (info.kind === 'layer') return S.cur === info.idx || S.marked.has(info.idx);
  if (info.kind === 'folder') return S.selFolder === info.fid || S.markedFolders.has(info.fid);
  return S.fxSel.has(info.eff);
}

// взятый ЛКМ элемент сразу становится активным (синим): данные + классы без
// ре-рендера (полный ре-рендер уничтожил бы строку и сорвал drag)
function selectGrabbed(el, info, box) {
  S.bgSel = false;
  if (info.kind === 'layer') { S.cur = info.idx; S.marked = new Set(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null; }
  else if (info.kind === 'folder') { S.selFolder = info.fid; S.markedFolders = new Set([info.fid]); S.marked.clear(); S.fxSel.clear(); S.fxCur = null; }
  else { S.fxSel = new Set([info.eff]); S.fxCur = info.eff; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; }
  box.querySelectorAll('.lrow.on, .lrow.marked, .fxrow.on, .fxrow.marked').forEach((r) => r.classList.remove('on', 'marked'));
  el.classList.remove('marked'); el.classList.add('on');
}

// можно ли «вложить/прикрепить» перетаскиваемое в центр строки row: слой/папка →
// внутрь папки; эффект/настройка → прикрепить к слою/папке (но не к эффекту)
function canIntoRow(info, row) {
  if (info.kind === 'fx') return row.classList.contains('lrow'); // эффект — только к слою/папке
  return row.classList.contains('frow') && canIntoFolder(info, +row.dataset.fid);
}

const rowKey = (row) => (row.dataset.li != null ? 'l' + row.dataset.li
  : row.dataset.fid != null ? 'f' + row.dataset.fid : 'e' + row.dataset.fxuid);

// Единый drag всех строк панели (слой/папка/эффект/настройка): призрак на курсоре
// + раздвигающийся зазор над/под целью; центр папки/слоя по выдержке → drop-into
// (вложить слой / прикрепить эффект). Перенос данных — layDrop или fxDrop.
export function dragRow(el, info) {
  const isFx = info.kind === 'fx';
  const targetSel = isFx ? '#lay-list .fxrow:not(.dragging), #lay-list .lrow:not(.dragging)' : '#lay-list .lrow:not(.dragging)';
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (e.button === 2) { rmbSweep(e, el); return; } // ПКМ-протяжка — множественный выбор (слои/папки/эффекты)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const isTouch = e.pointerType === 'touch';
    const sx = e.clientX, sy = e.clientY, box = $('lay-list');
    const pickUp = () => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !inSelection(info)) selectGrabbed(el, info, box); }; // взятый = активный (синий); ctrl/shift — это выбор, не захват
    if (!isTouch) pickUp(); // мышь: нажал ЛКМ — взял (как зажатая кнопка)
    let started = false, lifted = false, ghost = null, blk = null, dropRow = null, dropKey = '', dropBelow = false, dropInto = false, holdTimer = null;
    const gap = makeDropGap({ axis: 'y', className: 'layer-drop-gap' });
    // Подъём строки под перенос по удержанию (LIFT_MS): «взято», можно тащить в любую
    // сторону. Тач — так список листается (быстрый сдвиг = скролл, не drag). Мышь — то же
    // удержание показывает захват, но сдвиг начинает drag сразу (ниже). Разовый клик без
    // удержания и без сдвига — просто выбор строки.
    const lift = () => { if (lifted || started || pinchActive()) return; lifted = true; el.classList.add('lifting'); pickUp(); }; // не поднимаем во время щипка-слияния
    const liftTimer = setTimeout(lift, LIFT_MS);

    // Место вставки фиксируем синхронно (dropRow/dropBelow/dropInto) и читаем на
    // отпускании — зазор визуальный и раскрывается с задержкой. Центр папки/слоя
    // после FOLDER_HOLD_MS → drop-into; до этого отпускание = перестановка рядом.
    const setDrop = (row, zone) => {
      const into = canIntoRow(info, row) && zone.zone === 'center';
      const below = zone.after, key = rowKey(row) + ':' + (into ? 'center' : (below ? 'after' : 'before'));
      if (key === dropKey) return;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (dropRow) dropRow.classList.remove('drop-into');
      dropRow = row; dropKey = key; dropBelow = below; dropInto = false;
      if (into) { gap.cancel(); holdTimer = setTimeout(() => { row.classList.add('drop-into'); dropInto = true; }, FOLDER_HOLD_MS); return; }
      gap.request(box, row, below, row, key, DROP_GAP_HOLD_MS);
    };

    const begin = (x, y) => {
      started = true; el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      if (isFx) { blk = fxBlock(info.eff);
        box.querySelectorAll('#lay-list .fxrow').forEach((r) => { if (blk.includes(r.__eff)) r.classList.add('dragging'); }); }
      else { blk = dragBlock(info.idx);
        if (info.kind === 'layer' && blk.length > 1)
          box.querySelectorAll('#lay-list .lrow[data-li]').forEach((r) => { if (blk.includes(S.layers[+r.dataset.li])) r.classList.add('dragging'); });
        if (info.kind === 'folder' && S.markedFolders.has(info.fid) && S.markedFolders.size > 1)
          box.querySelectorAll('#lay-list .lrow[data-fid]').forEach((r) => { if (S.markedFolders.has(+r.dataset.fid)) r.classList.add('dragging'); }); }
      const count = isFx ? blk.length : (info.kind === 'folder' ? (S.markedFolders.has(info.fid) ? S.markedFolders.size : 1) : blk.length);
      ghost = dragGhost(el, el.getBoundingClientRect().width, count); ghost.move(x, y);
    };

    const move = (ev) => {
      if (pinchActive()) return;
      if (isTouch && (lifted || started) && ev.cancelable) ev.preventDefault();
      const ddx = ev.clientX - sx, ddy = ev.clientY - sy;
      if (!started) {
        const far = Math.hypot(ddx, ddy) > 7;
        if (lifted) { if (!far) return; clearTimeout(liftTimer); begin(ev.clientX, ev.clientY); } // поднято — тащим в любую сторону
        else if (isTouch) { if (far) clearTimeout(liftTimer); return; } // тач без подъёма — это скролл/свайп, не drag
        else { if (!far) return; clearTimeout(liftTimer); begin(ev.clientX, ev.clientY); } // мышь: сдвиг сразу начинает drag (любая сторона)
      }
      // призрак не выносим за пределы окна слоёв — иначе он «зависает»
      const pr = ($('lay-pop') || box).getBoundingClientRect();
      const gx = Math.max(pr.left + 8, Math.min(ev.clientX, pr.right - 8));
      const gy = Math.max(pr.top + 8, Math.min(ev.clientY, pr.bottom - 8));
      ghost.move(gx, gy);
      const t = document.elementFromPoint(gx, gy);
      const row = t && t.closest ? t.closest(targetSel) : null;
      if (!row) return; // над открытым зазором держим текущую цель, чтобы он не дрожал
      setDrop(row, dropZone(row, gx, gy, 'y', canIntoRow(info, row) ? undefined : 0));
    };

    const up = () => {
      clearTimeout(liftTimer);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      if (holdTimer) clearTimeout(holdTimer);
      if (ghost) ghost.remove();
      el.classList.remove('lifting');
      box.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      const target = dropRow, into = dropInto, below = !into && dropBelow;
      box.querySelectorAll('.drop-into').forEach((r) => r.classList.remove('drop-into'));
      gap.remove();
      if (!started || !target) return; setSquelch(true); setTimeout(() => setSquelch(false), 0);
      if (isFx) { fxDrop(blk, target, below); return; }
      layDrop(info, target, into, below);
      const dropped = $('lay-list').querySelector('.lrow[data-li="' + S.cur + '"]');
      if (dropped) { dropped.classList.add('dropped'); dropped.addEventListener('animationend', () => dropped.classList.remove('dropped'), { once: true }); }
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  });
}
