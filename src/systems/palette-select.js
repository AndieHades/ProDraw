// Интерактивная половина палитры: модель выделения свотчей, перетаскивание/
// перестановка (без gap), подбор shade-рампы и контекст-меню. Рендер свотчей —
// в palette.js; обратная связь идёт через колбэки rebuild()/setActive(),
// заданные initPaletteSelect (без кольцевых импортов).
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { $, toast, t, copyText, showMenuAt } from '../core/dom.js';
import { rgbToHex, eqc } from '../logic/color.js';
import { LONG_PRESS_MS } from '../config/timings.js';
import { dropZone, makeDropGap } from '../core/drop-gap.js';

let swHold = null, palDrag = null, palSquelch = false, ctxIdx = -1, ctxIdxs = [];
let palSel = new Set(), palAnchorIdx = -1, palRef = S.palette;
let rebuild = () => {}, setActive = () => {};

// согласовать выделение с текущей S.palette (другой массив → сброс; чистка
// устаревших индексов). Вызывается рендером перед отрисовкой свотчей.
export const validSel = () => { if (S.palette !== palRef) { palRef = S.palette; palSel = new Set(); palAnchorIdx = -1; }
  palSel = new Set([...palSel].filter((i) => i >= 0 && i < S.palette.length));
  if (!palSel.has(palAnchorIdx)) palAnchorIdx = palSel.size ? Math.min(...palSel) : -1; };

const swAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('#pal .sw:not(.plus)') : null; };
const swEl = (i) => $('pal').querySelector(`.sw[data-i="${i}"]`);
const squelch = () => { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0); }; // погасить click после жеста

function selectionForIdx(idx) { validSel(); return palSel.has(idx) && palSel.size ? [...palSel] : [idx]; }
function openCtx(x, y, idx) { ctxIdx = idx; ctxIdxs = selectionForIdx(idx);
  const c = S.palette[idx]; if (c) setActive(c, false); showMenuAt($('ctx'), x, y, true); }

function rangeIdx(from, to, max = Infinity) {
  const out = [], step = to >= from ? 1 : -1;
  for (let i = from; i >= 0 && i < S.palette.length && out.length < max; i += step) { out.push(i); if (i === to) break; }
  return out;
}
const colorsFromIdx = (idxs) => idxs.map((i) => S.palette[i].slice(0, 3));
export const selectedPaletteColors = () => { validSel(); return colorsFromIdx([...palSel]); };
function setPaletteSelection(idxs, anchor = idxs[0]) { palSel = new Set(idxs); palAnchorIdx = anchor ?? -1; rebuild(); }
function setShadingFromSelection(idxs) { const cols = colorsFromIdx(idxs); palSel = new Set(); palAnchorIdx = -1; actions.run('shading.setRamp', cols); }
function markMoving(idxs, on) { const set = new Set(idxs);
  for (const sw of $('pal').querySelectorAll('.sw:not(.plus)')) sw.classList.toggle('dragging', on && set.has(+sw.dataset.i)); }

// ctrl/⌘ + клик — поштучный тумблер; shift + клик — диапазон от якоря (или от
// активного цвета, если выделения ещё нет); ПКМ-протяжка — выделение наведением.
function togglePaletteSelect(idx) { validSel(); const next = new Set(palSel);
  if (next.has(idx)) next.delete(idx); else next.add(idx);
  setPaletteSelection([...next], idx); }
function rangePaletteSelect(idx) { validSel();
  let anchor = palAnchorIdx;
  if (anchor < 0) anchor = S.palette.findIndex((p) => eqc(p, S.active));
  if (anchor < 0) anchor = idx;
  setPaletteSelection(rangeIdx(anchor, idx), anchor); }
function paintSelect(i) { if (palSel.has(i)) return; palSel.add(i); if (palAnchorIdx < 0) palAnchorIdx = i;
  const sw = swEl(i); if (sw) sw.classList.add('pal-sel'); }
export function clearPaletteSelection() { if (!palSel.size) return; palSel = new Set(); palAnchorIdx = -1; rebuild(); }
actions.register('palette.clearSelection', clearPaletteSelection);

function markShadeRange(toIdx) {
  if (!palDrag) return;
  const idxs = rangeIdx(palDrag.idx, toIdx), picked = new Set(idxs);
  for (const sw of $('pal').querySelectorAll('.sw:not(.plus)')) { const i = +sw.dataset.i; sw.classList.toggle('shade-pending', picked.has(i)); }
  palDrag.idxs = idxs;
}
function clearShadePending() { $('pal').querySelectorAll('.shade-pending').forEach((sw) => sw.classList.remove('shade-pending')); }

function reorderIdxs(idxs, targetIdx, after, select = true) {
  const moving = [...idxs].sort((a, b) => a - b);
  if (!moving.length || moving.includes(targetIdx)) return false;
  const moveSet = new Set(moving), movingColors = moving.map((i) => S.palette[i]);
  const rest = S.palette.filter((_, i) => !moveSet.has(i));
  const insertRaw = targetIdx + (after ? 1 : 0);
  const insertAt = Math.max(0, Math.min(rest.length, insertRaw - moving.filter((i) => i < insertRaw).length));
  S.palette = [...rest.slice(0, insertAt), ...movingColors, ...rest.slice(insertAt)];
  palRef = S.palette;
  if (select) { palSel = new Set(movingColors.map((_, i) => insertAt + i)); palAnchorIdx = insertAt; }
  else { palSel = new Set(); palAnchorIdx = -1; }
  return true;
}

function deleteIdxs(idxs) {
  const del = new Set(idxs);
  if (!del.size) return;
  const removed = S.palette.filter((_, i) => del.has(i));
  S.palette = S.palette.filter((_, i) => !del.has(i));
  palRef = S.palette; palSel = new Set(); palAnchorIdx = -1;
  if (S.shading && S.shading.colors && S.shading.colors.some((c) => removed.some((r) => eqc(c, r)))) actions.run('shading.clear');
  else rebuild();
  toast(t('toast.colorRemoved'));
}

// навесить интеракцию на свотч: клик (active/тумблер/диапазон), ЛКМ-протяжка —
// перестановка сразу, ПКМ — контекст-меню/выделение наведением, тач — долгий
// тап. Класс выделения ставим здесь же.
export function wireSwatch(b, c, idx) {
  if (palSel.has(idx)) b.classList.add('pal-sel');
  b.addEventListener('click', (e) => { clearTimeout(swHold);
    if (palSquelch) { palSquelch = false; return; }
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); togglePaletteSelect(idx); return; }
    if (e.shiftKey) { e.preventDefault(); rangePaletteSelect(idx); return; }
    if (e.detail > 1) { setActive(c); return; }
    if (S.replaceMode) { const from = S.replaceMode.from; S.replaceMode = null; actions.run('recolor.all', from, c.slice()); return; }
    clearPaletteSelection();
    setActive(c); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('pointerdown', (e) => {
    validSel();
    const moveSel = palSel.has(idx) && palSel.size > 1; // перенос всего выделения, если тянем выделенный свотч
    const moveIdxs = moveSel ? [...palSel] : [idx], picking = !!(S.shading && S.shading.picking);
    const gap = makeDropGap({ className: 'palette-drop-gap', enabled: false }); // «без gap»: место вставки считаем, но свотчи не раздвигаем
    const base = { b, idx, x: e.clientX, y: e.clientY, moved: false, moveSel, moveIdxs, gap, picking };
    if (e.pointerType === 'touch') { // тач: долгий тап поднимает для перестановки/меню (правой кнопки нет)
      const armLift = () => { if (palDrag && !palDrag.moved) { palDrag.lifted = true; if (!palDrag.moveSel) b.classList.add('lifting'); } };
      clearTimeout(swHold); swHold = setTimeout(armLift, LONG_PRESS_MS); palDrag = { ...base, touch: true }; return; }
    if (e.button === 2) { e.preventDefault(); palDrag = { b, idx, rmb: true, x: e.clientX, y: e.clientY, moved: false, gap: null }; return; }
    if (e.button === 0) palDrag = { ...base, left: true }; });
}

function palShadeMove(tg) { const chip = $('paldrag'); // ramp-picking: короткий драг тянет диапазон оттенков
  if (tg && tg !== palDrag.b) { palDrag.selecting = true; palDrag.b.classList.remove('dragging'); chip.classList.remove('on'); markShadeRange(+tg.dataset.i); }
  else if (palDrag.selecting && tg) markShadeRange(+tg.dataset.i); }

function palReorderMove(e, tg) { const pal = $('pal'), chip = $('paldrag');
  palDrag.reordering = true;
  if (palDrag.moveSel) markMoving(palDrag.moveIdxs, true); else { palDrag.b.classList.remove('lifting'); palDrag.b.classList.add('dragging'); }
  chip.classList.add('on'); chip.style.background = palDrag.b.style.background;
  chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px';
  if (palDrag.moveIdxs.length > 1) chip.dataset.stack = palDrag.moveIdxs.length > 2 ? '3' : '2';
  if (tg) palDrag.gap.show(pal, tg, dropZone(tg, e.clientX, e.clientY, 'x', 0).after, tg); else palDrag.gap.cancel(); }

function palDragMove(e) { if (!palDrag) return;
  if (!palDrag.moved) { if (Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) <= 6) return; palDrag.moved = true; clearTimeout(swHold); }
  const tg = swAt(e);
  if (palDrag.rmb) { if (!palDrag.painted) { palDrag.painted = true; paintSelect(palDrag.idx); } if (tg) paintSelect(+tg.dataset.i); return; }
  if (palDrag.picking) { palShadeMove(tg); return; }
  if (palDrag.left || palDrag.lifted || palDrag.moveSel) palReorderMove(e, tg); }

function palDragEnd(e) { if (!palDrag) return; clearTimeout(swHold);
  const d = palDrag, chip = $('paldrag'); palDrag = null; markMoving(d.moveIdxs || [d.idx], false);
  d.b.classList.remove('dragging', 'lifting'); chip.classList.remove('on'); delete chip.dataset.stack; clearShadePending();
  const tgt = e ? document.elementFromPoint(e.clientX, e.clientY) : null;
  const targetSw = d.gap?.target || (tgt && tgt.closest ? tgt.closest('#pal .sw:not(.plus)') : null);
  const gapAfter = !!d.gap?.after, gapActive = !!d.gap?.active; d.gap?.remove();
  if (d.rmb) { if (!d.moved) { if (e) openCtx(e.clientX, e.clientY, d.idx); } else rebuild(); return; } // клик → меню, протяжка → выделение наведением
  if (d.selecting) { squelch();
    if (d.idxs && d.idxs.length > 1) { if (S.shading && S.shading.picking) setShadingFromSelection(d.idxs); else setPaletteSelection(d.idxs, d.idx); } return; }
  if (d.lifted && !d.moved) { if (e) openCtx(e.clientX, e.clientY, d.idx); return; } // тач: долгий тап без переноса → меню
  if (d.reordering) { squelch();
    const onPal = tgt && tgt.closest && tgt.closest('#pal');
    if (!onPal && !d.moveSel) { if (!actions.run('layer.dropColorAt', S.palette[d.idx], e.clientX, e.clientY)) actions.run('edit.dropColorAt', S.palette[d.idx], e.clientX, e.clientY); rebuild(); return; } // бросок мимо палитры → слой/заливка
    if (targetSw) { const r = targetSw.getBoundingClientRect();
      if (reorderIdxs(d.moveIdxs, +targetSw.dataset.i, gapActive ? gapAfter : e.clientX >= r.left + r.width / 2, d.moveSel)) { rebuild(); return; } }
    rebuild(); } }

// document-слушатели жеста + обработчик контекст-меню; колбэки связывают с рендером
export function initPaletteSelect({ rebuild: rb, setActive: sa }) {
  rebuild = rb; setActive = sa;
  document.addEventListener('pointermove', palDragMove);
  document.addEventListener('pointerup', palDragEnd);
  document.addEventListener('pointercancel', palDragEnd);
  $('ctx').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return;
    validSel();
    const ids = (ctxIdxs.length ? ctxIdxs : [ctxIdx]).filter((i) => i >= 0 && i < S.palette.length);
    const cols = colorsFromIdx(ids);
    const col = cols[0]; $('ctx').classList.remove('on'); if (!col) return;
    const act = btn.dataset.act;
    if (act === 'copy') { const h = cols.map((c) => rgbToHex(c).toUpperCase()).join('\n'); copyText(h).then(() => toast(t('toast.copied', { s: h }))); }
    else if (act === 'shade') { palSel = new Set(); palAnchorIdx = -1; actions.run('shading.setRamp', cols); }
    else if (act === 'delete') deleteIdxs(ids);
    else if (act === 'select') actions.run('selection.byColor', cols);
    else if (act === 'replace') actions.run('color.replace', cols); });
}
