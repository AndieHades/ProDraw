// Интерактивный кроп: рамка с маркерами, грани наружу — расширить, внутри —
// ЛКМ сдвигает рисунок, ПКМ сдвигает crop-рамку. Применение — applyCropRect.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { commitNumericField, isNumericLiteral, numericFieldValue, setNumericField } from '../core/numeric-field.js';
import { applyCropRect } from '../core/document.js';
import { registerMode } from '../core/canvas-handlers.js';
import { ensureGrid, gridCellH, gridCellW, setGridVisible } from '../core/grid.js';
import { canvasContentBounds } from '../core/canvas-bounds.js';
import { MAX_SIZE } from '../config/limits.js';
import { clampRound } from '../logic/math.js';

let cropDrag = null, cropSym = false, cropLink = false, cropRatio = 1, cropCells = false, cropTrim = false, mounted = false;
let cellBase = null, trimBase = null;

const cropSize = (c = S.cropMode) => ({ w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1 });
const clampDim = (v) => clampRound(v, 1, MAX_SIZE);
const clampCellSize = (v) => clampRound(v, 1, 128);
const cellW = () => gridCellW();
const cellH = () => gridCellH();
const maxCellW = () => Math.max(1, Math.floor(MAX_SIZE / cellW()));
const maxCellH = () => Math.max(1, Math.floor(MAX_SIZE / cellH()));
const clampCellW = (v) => clampRound(v, 1, maxCellW());
const clampCellH = (v) => clampRound(v, 1, maxCellH());
const cellCountW = (c = S.cropMode) => clampCellW(cropSize(c).w / cellW());
const cellCountH = (c = S.cropMode) => clampCellH(cropSize(c).h / cellH());
const cloneCrop = (c) => (c ? { ...c, b: c.b ? { ...c.b } : c.b } : null);
function restoreCrop(src) { if (!S.cropMode || !src) return; Object.assign(S.cropMode, cloneCrop(src)); }
function syncTrim() { $('crop-trim')?.classList.toggle('on', cropTrim); }
function clearTrimPreview() { cropTrim = false; trimBase = null; syncTrim(); }
function syncCellSize() { $('crop-cell-size-row')?.classList.toggle('on', cropCells);
  if ($('crop-cell-size')) setNumericField($('crop-cell-size'), cellW()); }
function syncCropInputs() { if (!S.cropMode) return; const s = cropSize();
  if (cropCells) { setNumericField($('crop-w'), cellCountW()); setNumericField($('crop-h'), cellCountH()); }
  else { setNumericField($('crop-w'), s.w); setNumericField($('crop-h'), s.h); }
  syncCellSize();
  const px = $('crop-px'); if (px) px.textContent = s.w + '×' + s.h + ' px'; } // всегда показываем размер холста в пикселях

// режим единиц: пиксели ↔ клетки (X×Y по текущей сетке Grid)
function setCropUnits(on, opts = {}) { if (cropCells === on) { syncCropInputs(); return; }
  clearTrimPreview();
  if (on) cellBase = cloneCrop(S.cropMode);
  cropCells = on; $('crop-units').classList.toggle('on', on);
  $('crop-wl').textContent = on ? 'X' : t('label.width'); $('crop-hl').textContent = on ? 'Y' : t('label.height');
  if (on && S.cropMode) snapCells(S.cropMode);
  if (!on) { if (opts.restore !== false) restoreCrop(cellBase); cellBase = null; }
  syncCropInputs(); bus.emit('render'); }
function syncCropGrid() { const g = ensureGrid();
  const visible = $('crop-grid-visible'); if (visible) visible.checked = !!g.visible;
  syncCellSize(); }
function setCropGridVisibility(on) { setGridVisible(on); syncCropGrid(); bus.emit('grid'); bus.emit('render'); }
function cropCellInputCounts() {
  if (!isNumericLiteral($('crop-w').value) || !isNumericLiteral($('crop-h').value)) return { wc: cellCountW(), hc: cellCountH() };
  const wc = numericFieldValue($('crop-w'), cellCountW()), hc = numericFieldValue($('crop-h'), cellCountH());
  return { wc: wc ? clampCellW(wc) : cellCountW(), hc: hc ? clampCellH(hc) : cellCountH() };
}
function setCropCellSize(commit = false) { if (!cropCells || !S.cropMode) return; const input = $('crop-cell-size'); if (!input) return;
  const counts = cropCellInputCounts();
  if (commit) commitNumericField(input, { min: 1, max: 128, integer: true, relativeMinus: true });
  if (!isNumericLiteral(input.value)) return;
  const v = numericFieldValue(input, cellW()); if (!v) return;
  const g = ensureGrid(), size = clampCellSize(v);
  g.w = g.h = size;
  placeCells(counts.wc, counts.hc);
  syncCropGrid(); bus.emit('grid'); bus.emit('render'); }
function trimFromCrop() { if (!S.cropMode) return;
  if (cropTrim) { restoreCrop(trimBase); cropTrim = false; trimBase = null; syncTrim(); syncCropInputs(); bus.emit('render'); return; }
  const g = canvasContentBounds();
  if (!g) { toast(t('toast.canvasEmpty')); return; }
  const c = S.cropMode, was = c.x0 === g.minx && c.y0 === g.miny && c.x1 === g.maxx && c.y1 === g.maxy && !c.idx && !c.idy;
  if (cropCells) setCropUnits(false, { restore: false });
  trimBase = cloneCrop(c); cropTrim = true; syncTrim();
  c.x0 = g.minx; c.y0 = g.miny; c.x1 = g.maxx; c.y1 = g.maxy; c.idx = 0; c.idy = 0;
  syncCropInputs(); bus.emit('render');
  if (was) toast(t('toast.nothingTrim')); }
// привязать рамку к границам клеток (с сохранением целого числа клеток)
function snapCells(c) { const cw = cellW(), ch = cellH();
  c.x0 = Math.round(c.x0 / cw) * cw; c.y0 = Math.round(c.y0 / ch) * ch;
  c.x1 = c.x0 + clampDim(Math.max(1, Math.round((c.x1 - c.x0 + 1) / cw)) * cw) - 1;
  c.y1 = c.y0 + clampDim(Math.max(1, Math.round((c.y1 - c.y0 + 1) / ch)) * ch) - 1; }
function placeCells(wc, hc) { clearTrimPreview(); const c = S.cropMode, cw = cellW(), ch = cellH();
  wc = clampCellW(wc); hc = clampCellH(hc);
  c.x0 = Math.round(c.x0 / cw) * cw; c.y0 = Math.round(c.y0 / ch) * ch;
  c.x1 = c.x0 + clampDim(wc * cw) - 1; c.y1 = c.y0 + clampDim(hc * ch) - 1; syncCropInputs(); bus.emit('render'); }
function setCropLink(on) { cropLink = on; $('crop-link').classList.toggle('on', on);
  if (on && S.cropMode) { const s = cropSize(); cropRatio = s.w > 0 && s.h > 0 ? s.w / s.h : 1; } }
function placeCrop(w, h, cx = (S.cropMode.x0 + S.cropMode.x1) / 2, cy = (S.cropMode.y0 + S.cropMode.y1) / 2) {
  clearTrimPreview();
  const c = S.cropMode; w = clampDim(w); h = clampDim(h);
  c.x0 = Math.round(cx - (w - 1) / 2); c.y0 = Math.round(cy - (h - 1) / 2);
  c.x1 = c.x0 + w - 1; c.y1 = c.y0 + h - 1; syncCropInputs(); bus.emit('render'); }
function ratioDims(w, h, preferW) {
  w = clampDim(w); h = clampDim(h);
  if (preferW) h = clampDim(w / cropRatio); else w = clampDim(h * cropRatio);
  return { w, h };
}
function ratioCells(wc, hc, preferW) {
  wc = clampCellW(wc); hc = clampCellH(hc);
  const cw = cellW(), ch = cellH();
  if (preferW) hc = clampCellH((wc * cw) / cropRatio / ch);
  else wc = clampCellW((hc * ch) * cropRatio / cw);
  return { wc, hc };
}
function lockRatio(c, d, symm) {
  const s = cropSize(c), sw = d.x1 - d.x0 + 1, sh = d.y1 - d.y0 + 1;
  const preferW = (d.l || d.r) && !(d.t || d.b) ? true : (d.t || d.b) && !(d.l || d.r) ? false : s.w / sw >= s.h / sh;
  const r = ratioDims(s.w, s.h, preferW), byCx = symm || !(d.l || d.r), byCy = symm || !(d.t || d.b);
  c.x0 = byCx ? Math.round(d.cx - (r.w - 1) / 2) : d.l ? d.x1 - r.w + 1 : d.x0;
  c.y0 = byCy ? Math.round(d.cy - (r.h - 1) / 2) : d.t ? d.y1 - r.h + 1 : d.y0;
  c.x1 = c.x0 + r.w - 1; c.y1 = c.y0 + r.h - 1;
}
function lockCellRatio(c, d, symm) {
  const s = cropSize(c), sw = d.x1 - d.x0 + 1, sh = d.y1 - d.y0 + 1;
  const preferW = (d.l || d.r) && !(d.t || d.b) ? true : (d.t || d.b) && !(d.l || d.r) ? false : s.w / sw >= s.h / sh;
  const r = ratioCells(s.w / cellW(), s.h / cellH(), preferW), w = r.wc * cellW(), h = r.hc * cellH();
  const byCx = symm || !(d.l || d.r), byCy = symm || !(d.t || d.b);
  c.x0 = byCx ? Math.round((d.cx - (w - 1) / 2) / cellW()) * cellW() : d.l ? c.x1 - w + 1 : c.x0;
  c.y0 = byCy ? Math.round((d.cy - (h - 1) / 2) / cellH()) * cellH() : d.t ? c.y1 - h + 1 : c.y0;
  c.x1 = c.x0 + w - 1; c.y1 = c.y0 + h - 1;
}

export function toggleCrop() { if (S.cropMode) { cancelCrop(); return; }
  const b = S.sel ? { x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1 } : { x0: 0, y0: 0, x1: S.W - 1, y1: S.H - 1 };
  S.cropMode = { ...b, idx: 0, idy: 0, b }; S.sel = null; S.selMask = null; bus.emit('selection');
  cellBase = null; trimBase = null; cropTrim = false; syncTrim();
  $('crop').classList.add('on'); $('cropbar').classList.add('on'); if (cropCells) snapCells(S.cropMode); if (cropLink) setCropLink(true); syncCropGrid(); syncCropInputs(); bus.emit('render');
  toast(t('toast.cropHint')); }

export function cancelCrop() { S.cropMode = null; cropDrag = null; $('cv').style.cursor = '';
  cellBase = null; trimBase = null; cropTrim = false; syncTrim();
  $('crop').classList.remove('on'); $('cropbar').classList.remove('on'); bus.emit('render'); }

export function applyCrop() { if (!S.cropMode) return; const c = S.cropMode; cancelCrop();
  if (c.x0 === 0 && c.y0 === 0 && c.x1 === S.W - 1 && c.y1 === S.H - 1 && !c.idx && !c.idy) { toast(t('toast.sizeUnchanged')); return; }
  applyCropRect(c.x0 - c.idx, c.y0 - c.idy, c.x1 - c.idx, c.y1 - c.idy); }

function cropZone(e) { const r = $('cv').getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  const z = S.view.zoom, lx = S.view.ox + S.cropMode.x0 * z, rx = S.view.ox + (S.cropMode.x1 + 1) * z, ty = S.view.oy + S.cropMode.y0 * z, by = S.view.oy + (S.cropMode.y1 + 1) * z, tol = 24;
  const nl = Math.abs(px - lx) < tol, nr = Math.abs(px - rx) < tol, nt = Math.abs(py - ty) < tol, nb = Math.abs(py - by) < tol;
  const inX = px > lx - tol && px < rx + tol, inY = py > ty - tol && py < by + tol;
  return { l: nl && inY, r: nr && inY, t: nt && inX, b: nb && inX, inside: px > lx && px < rx && py > ty && py < by }; }
function cropCursor(zn) { const h = zn.l || zn.r, v = zn.t || zn.b;
  if (h && v) return ((zn.l && zn.t) || (zn.r && zn.b)) ? 'nwse-resize' : 'nesw-resize'; if (h) return 'ew-resize'; if (v) return 'ns-resize'; return zn.inside ? 'move' : ''; }

function cropDown({ e }) { const zn = cropZone(e);
  if (zn.l || zn.r || zn.t || zn.b) cropDrag = { l: zn.l, r: zn.r, t: zn.t, b: zn.b, x0: S.cropMode.x0, y0: S.cropMode.y0, x1: S.cropMode.x1, y1: S.cropMode.y1, cx: (S.cropMode.x0 + S.cropMode.x1) / 2, cy: (S.cropMode.y0 + S.cropMode.y1) / 2 };
  else if (zn.inside) { const r = $('cv').getBoundingClientRect(), gx = (e.clientX - r.left - S.view.ox) / S.view.zoom, gy = (e.clientY - r.top - S.view.oy) / S.view.zoom;
    cropDrag = e.button === 2 ? { move: true, x0: S.cropMode.x0, y0: S.cropMode.y0, x1: S.cropMode.x1, y1: S.cropMode.y1, gx, gy } : { img: true, gx, gy }; }
  else cropDrag = null; }

function cropMovePt({ e }) { if (!cropDrag || !S.cropMode) return; const r = $('cv').getBoundingClientRect(), z = S.view.zoom, c = S.cropMode;
  clearTrimPreview();
  const fx = (e.clientX - r.left - S.view.ox) / z, fy = (e.clientY - r.top - S.view.oy) / z;
  if (cropDrag.move) { const dx = Math.round(fx - cropDrag.gx), dy = Math.round(fy - cropDrag.gy);
    c.x0 = cropDrag.x0 + dx; c.x1 = cropDrag.x1 + dx; c.y0 = cropDrag.y0 + dy; c.y1 = cropDrag.y1 + dy; }
  else if (cropDrag.img) { const dx = Math.round(fx - cropDrag.gx), dy = Math.round(fy - cropDrag.gy); if (dx || dy) { c.idx += dx; c.idy += dy; cropDrag.gx += dx; cropDrag.gy += dy; } }
  else { const symm = cropSym || e.shiftKey;
    if (cropDrag.l) { c.x0 = Math.min(c.x1, Math.round(fx)); if (symm) c.x1 = Math.round(2 * cropDrag.cx - c.x0); }
    if (cropDrag.r) { c.x1 = Math.max(c.x0, Math.round(fx) - 1); if (symm) c.x0 = Math.round(2 * cropDrag.cx - c.x1); }
    if (cropDrag.t) { c.y0 = Math.min(c.y1, Math.round(fy)); if (symm) c.y1 = Math.round(2 * cropDrag.cy - c.y0); }
    if (cropDrag.b) { c.y1 = Math.max(c.y0, Math.round(fy) - 1); if (symm) c.y0 = Math.round(2 * cropDrag.cy - c.y1); }
    if (cropLink) lockRatio(c, cropDrag, symm);
    if (c.x1 - c.x0 + 1 > MAX_SIZE) { if (cropDrag.l) c.x0 = c.x1 - MAX_SIZE + 1; else c.x1 = c.x0 + MAX_SIZE - 1; }
    if (c.y1 - c.y0 + 1 > MAX_SIZE) { if (cropDrag.t) c.y0 = c.y1 - MAX_SIZE + 1; else c.y1 = c.y0 + MAX_SIZE - 1; }
    if (cropCells) { const cw = cellW(), ch = cellH(); // тянем ровно по клеткам
      if (cropDrag.l) c.x0 = Math.round(c.x0 / cw) * cw; if (cropDrag.r) c.x1 = Math.round((c.x1 + 1) / cw) * cw - 1;
      if (cropDrag.t) c.y0 = Math.round(c.y0 / ch) * ch; if (cropDrag.b) c.y1 = Math.round((c.y1 + 1) / ch) * ch - 1;
      if (c.x1 < c.x0) c.x1 = c.x0 + cw - 1; if (c.y1 < c.y0) c.y1 = c.y0 + ch - 1;
      if (cropLink) lockCellRatio(c, cropDrag, symm); } }
  syncCropInputs(); bus.emit('render'); }

function cropInput(which, commit = false) { if (!S.cropMode) return;
  const id = which === 'w' ? 'crop-w' : 'crop-h';
  if (cropCells) { const maxC = which === 'w' ? maxCellW() : maxCellH();
    if (commit) commitNumericField($(id), { min: 1, max: maxC, integer: true, relativeMinus: true });
    if (!isNumericLiteral($('crop-w').value) || !isNumericLiteral($('crop-h').value)) return;
    let wc = numericFieldValue($('crop-w'), cellCountW()), hc = numericFieldValue($('crop-h'), cellCountH()); if (!wc || !hc) return;
    wc = clampCellW(wc); hc = clampCellH(hc);
    if (cropLink) { const r = ratioCells(wc, hc, which === 'w'); wc = r.wc; hc = r.hc; }
    placeCells(wc, hc); return; }
  if (commit) commitNumericField($(id), { min: 1, max: MAX_SIZE, integer: true, relativeMinus: true });
  if (!isNumericLiteral($('crop-w').value) || !isNumericLiteral($('crop-h').value)) return;
  let w = numericFieldValue($('crop-w'), cropSize().w), h = numericFieldValue($('crop-h'), cropSize().h);
  if (!w || !h) return; if (cropLink) { const r = ratioDims(w, h, which === 'w'); w = r.w; h = r.h; }
  placeCrop(w, h); }

export function mount() {
  if (mounted) return; mounted = true;
  $('crop').onclick = toggleCrop; $('crop-ok').onclick = applyCrop; $('crop-cancel').onclick = cancelCrop;
  $('crop-sym').onclick = () => { cropSym = !cropSym; $('crop-sym').classList.toggle('on', cropSym); toast(cropSym ? t('toast.cropCenter') : t('toast.cropEdge')); };
  $('crop-link').onclick = () => setCropLink(!cropLink);
  $('crop-units').onclick = () => setCropUnits(!cropCells);
  $('crop-trim').onclick = trimFromCrop;
  $('crop-grid-visible').addEventListener('change', () => setCropGridVisibility($('crop-grid-visible').checked));
  $('crop-cell-size').addEventListener('input', () => setCropCellSize(false));
  $('crop-cell-size').addEventListener('blur', () => setCropCellSize(true));
  $('crop-cell-size').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); $('crop-cell-size').blur(); } });
  bus.on('grid', syncCropGrid);
  syncCropGrid();
  for (const id of ['crop-w', 'crop-h']) { const which = id === 'crop-w' ? 'w' : 'h';
    $(id).addEventListener('input', () => cropInput(which));
    $(id).addEventListener('blur', () => cropInput(which, true));
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); $(id).blur(); } }); }
  registerMode('crop', { down: cropDown, move: cropMovePt, up: () => { cropDrag = null; }, hover: ({ e }) => { $('cv').style.cursor = cropCursor(cropZone(e)); } });
  window.addEventListener('keydown', (e) => { if (!S.cropMode) return;
    if (e.key === 'Enter') { e.preventDefault(); applyCrop(); } else if (e.key === 'Escape') { e.preventDefault(); cancelCrop(); } });
}

actions.register('canvas.crop', toggleCrop);
