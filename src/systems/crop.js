// Интерактивный кроп: рамка с маркерами, грани наружу — расширить, внутри —
// ЛКМ сдвигает рисунок, ПКМ сдвигает crop-рамку. Применение — applyCropRect.
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { $, toast, t } from '../ui/dom/ShellDom.ts';
import { commitNumericField, isNumericLiteral, numericFieldValue, setNumericField } from '../core/numeric-field.ts';
import { applyCropRect } from '../core/document.js';
import { registerMode } from '../core/canvas-handlers.js';
import { ensureGrid, gridCellH, gridCellW, setGridVisible } from '../core/grid.js';
import { canvasContentBounds } from '../core/canvas-bounds.js';
import { MAX_SIZE } from '../config/limits.ts';
import { clampRound } from '../logic/math.ts';
import { cropRatioCells, cropRatioDimensions } from '../logic/cropRatio.ts';
import { mountCropControls } from '../ui/crop/CropControlsPresenter.ts';
import { CropPointerSystem } from './crop/CropPointerSystem.ts';

let cropSym = false, cropLink = false, cropRatio = 1, cropCells = false, cropTrim = false, mounted = false;
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

export function toggleCrop() { if (S.cropMode) { cancelCrop(); return; }
  const b = S.sel ? { x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1 } : { x0: 0, y0: 0, x1: S.W - 1, y1: S.H - 1 };
  S.cropMode = { ...b, idx: 0, idy: 0, b }; S.sel = null; S.selMask = null; bus.emit('selection');
  cellBase = null; trimBase = null; cropTrim = false; syncTrim();
  $('crop').classList.add('on'); $('cropbar').classList.add('on'); if (cropCells) snapCells(S.cropMode); if (cropLink) setCropLink(true); syncCropGrid(); syncCropInputs(); bus.emit('render');
  toast(t('toast.cropHint')); }

export function cancelCrop() { S.cropMode = null; cropPointer.cancel(); $('cv').style.cursor = '';
  cellBase = null; trimBase = null; cropTrim = false; syncTrim();
  $('crop').classList.remove('on'); $('cropbar').classList.remove('on'); bus.emit('render'); }

export function applyCrop() { if (!S.cropMode) return; const c = S.cropMode; cancelCrop();
  if (c.x0 === 0 && c.y0 === 0 && c.x1 === S.W - 1 && c.y1 === S.H - 1 && !c.idx && !c.idy) { toast(t('toast.sizeUnchanged')); return; }
  applyCropRect(c.x0 - c.idx, c.y0 - c.idy, c.x1 - c.idx, c.y1 - c.idy); }

const cropPointer = new CropPointerSystem({ canvas: () => $('cv'), crop: () => S.cropMode,
  view: () => S.view, symmetric: () => cropSym, linked: () => cropLink,
  ratio: () => cropRatio, cells: () => cropCells,
  cellSize: () => ({ width: cellW(), height: cellH() }), maximum: MAX_SIZE,
  clearTrim: clearTrimPreview, syncInputs: syncCropInputs,
  render: () => bus.emit('render') });

function cropInput(which, commit = false) { if (!S.cropMode) return;
  const id = which === 'w' ? 'crop-w' : 'crop-h';
  if (cropCells) { const maxC = which === 'w' ? maxCellW() : maxCellH();
    if (commit) commitNumericField($(id), { min: 1, max: maxC, integer: true, relativeMinus: true });
    if (!isNumericLiteral($('crop-w').value) || !isNumericLiteral($('crop-h').value)) return;
    let wc = numericFieldValue($('crop-w'), cellCountW()), hc = numericFieldValue($('crop-h'), cellCountH()); if (!wc || !hc) return;
    wc = clampCellW(wc); hc = clampCellH(hc);
    if (cropLink) { const r = cropRatioCells(wc, hc, cropRatio, which === 'w', cellW(), cellH(), maxCellW(), maxCellH()); wc = r.width; hc = r.height; }
    placeCells(wc, hc); return; }
  if (commit) commitNumericField($(id), { min: 1, max: MAX_SIZE, integer: true, relativeMinus: true });
  if (!isNumericLiteral($('crop-w').value) || !isNumericLiteral($('crop-h').value)) return;
  let w = numericFieldValue($('crop-w'), cropSize().w), h = numericFieldValue($('crop-h'), cropSize().h);
  if (!w || !h) return; if (cropLink) { const r = cropRatioDimensions(w, h, cropRatio, which === 'w', MAX_SIZE); w = r.width; h = r.height; }
  placeCrop(w, h); }

export function mount() {
  if (mounted) return; mounted = true;
  mountCropControls({ active: () => !!S.cropMode, toggle: toggleCrop, apply: applyCrop,
    cancel: cancelCrop, toggleSymmetry: () => { cropSym = !cropSym;
      $('crop-sym').classList.toggle('on', cropSym);
      toast(cropSym ? t('toast.cropCenter') : t('toast.cropEdge')); },
    toggleLink: () => setCropLink(!cropLink), toggleUnits: () => setCropUnits(!cropCells),
    toggleTrim: trimFromCrop, gridChanged: setCropGridVisibility, setCellSize: setCropCellSize,
    subscribeGrid: (listener) => { bus.on('grid', listener); }, syncGrid: syncCropGrid,
    dimensionInput: cropInput, bindCanvasMode: () => registerMode('crop',
      { down: ({ e }) => cropPointer.down(e), move: ({ e }) => cropPointer.move(e),
        up: () => cropPointer.end(), hover: ({ e }) => cropPointer.hover(e) }) });
}

actions.register('canvas.crop', toggleCrop);
