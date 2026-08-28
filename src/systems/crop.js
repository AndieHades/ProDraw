// Лёгкий crop: рамка и числовой размер холста. Сетка и cell-режим намеренно
// не входят в ассетный редактор — они не нужны для PSD/PNG-подготовки.
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { $, toast, t } from '../ui/dom/ShellDom.ts';
import { commitNumericField, isNumericLiteral, numericFieldValue,
  setNumericField } from '../core/numeric-field.ts';
import { applyCropRect } from '../core/document.js';
import { registerMode } from '../core/canvas-handlers.ts';
import { MAX_SIZE } from '../config/limits.ts';
import { clampRound } from '../logic/math.ts';
import { mountCropControls } from '../ui/crop/CropControlsPresenter.ts';
import { CropPointerSystem } from './crop/CropPointerSystem.ts';

let mounted = false;
const cropSize = (crop = S.cropMode) => ({ w: crop.x1 - crop.x0 + 1,
  h: crop.y1 - crop.y0 + 1 });
const clampDim = (value) => clampRound(value, 1, MAX_SIZE);

function syncInputs() {
  if (!S.cropMode) return;
  const size = cropSize();
  setNumericField($('crop-w'), size.w); setNumericField($('crop-h'), size.h);
  $('crop-px').textContent = `${size.w}×${size.h} px`;
}

function placeCrop(width, height) {
  const crop = S.cropMode, old = cropSize();
  const cx = (crop.x0 + crop.x1) / 2, cy = (crop.y0 + crop.y1) / 2;
  const w = clampDim(width), h = clampDim(height);
  crop.x0 = Math.round(cx - (w - 1) / 2); crop.y0 = Math.round(cy - (h - 1) / 2);
  crop.x1 = crop.x0 + w - 1; crop.y1 = crop.y0 + h - 1;
  if (old.w !== w || old.h !== h) bus.emit('render');
  syncInputs();
}

function dimensionInput(dimension, commit = false) {
  if (!S.cropMode) return;
  const id = `crop-${dimension}`;
  if (commit) commitNumericField($(id), { min: 1, max: MAX_SIZE,
    integer: true, relativeMinus: true });
  if (!isNumericLiteral($('crop-w').value) || !isNumericLiteral($('crop-h').value)) return;
  const current = cropSize();
  const width = numericFieldValue($('crop-w'), current.w);
  const height = numericFieldValue($('crop-h'), current.h);
  if (width && height) placeCrop(width, height);
}

export function toggleCrop() {
  if (S.cropMode) { cancelCrop(); return; }
  const bounds = S.sel ? { x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1 }
    : { x0: 0, y0: 0, x1: S.W - 1, y1: S.H - 1 };
  S.cropMode = { ...bounds, idx: 0, idy: 0, b: bounds };
  S.sel = null; S.selMask = null; bus.emit('selection');
  $('crop').classList.add('on'); $('cropbar').classList.add('on');
  syncInputs(); bus.emit('render'); toast(t('toast.cropHint'));
}

export function cancelCrop() {
  S.cropMode = null; cropPointer.cancel(); $('cv').style.cursor = '';
  $('crop').classList.remove('on'); $('cropbar').classList.remove('on');
  bus.emit('render');
}

export function applyCrop() {
  if (!S.cropMode) return;
  const crop = S.cropMode; cancelCrop();
  if (crop.x0 === 0 && crop.y0 === 0 && crop.x1 === S.W - 1 && crop.y1 === S.H - 1
    && !crop.idx && !crop.idy) { toast(t('toast.sizeUnchanged')); return; }
  applyCropRect(crop.x0 - crop.idx, crop.y0 - crop.idy,
    crop.x1 - crop.idx, crop.y1 - crop.idy);
}

const cropPointer = new CropPointerSystem({ canvas: () => $('cv'),
  crop: () => S.cropMode, view: () => S.view, symmetric: () => false,
  linked: () => false, ratio: () => 1, cells: () => false,
  cellSize: () => ({ width: 1, height: 1 }), maximum: MAX_SIZE,
  clearTrim: () => undefined, syncInputs, render: () => bus.emit('render') });

export function mount() {
  if (mounted) return;
  mounted = true;
  mountCropControls({ active: () => !!S.cropMode, toggle: toggleCrop,
    apply: applyCrop, cancel: cancelCrop, dimensionInput,
    bindCanvasMode: () => registerMode('crop', { hit: ({ e }) => cropPointer.hit(e),
      down: ({ e }) => cropPointer.down(e),
      move: ({ e }) => cropPointer.move(e), up: () => cropPointer.end(),
      hover: ({ e }) => cropPointer.hover(e) }) });
}

actions.register('canvas.crop', toggleCrop);
