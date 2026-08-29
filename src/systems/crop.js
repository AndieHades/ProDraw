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
import { appliedCropRect, createCropMode, cropChangesDocument,
  cropSize as measureCrop, placeCropSize } from './crop/CropSession.ts';

let mounted = false;
const cropSize = (crop = S.cropMode) => { const size = measureCrop(crop);
  return { w: size.width, h: size.height }; };
const clampDim = (value) => clampRound(value, 1, MAX_SIZE);

function syncInputs() {
  if (!S.cropMode) return;
  const size = cropSize();
  setNumericField($('crop-w'), size.w); setNumericField($('crop-h'), size.h);
  $('crop-px').textContent = `${size.w}×${size.h} px`;
}

function placeCrop(width, height) {
  const w = clampDim(width), h = clampDim(height);
  if (placeCropSize(S.cropMode, w, h)) bus.emit('render');
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
  S.cropMode = createCropMode(S.W, S.H, S.sel);
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
  if (!cropChangesDocument(crop, S.W, S.H)) {
    toast(t('toast.sizeUnchanged')); return; }
  const bounds = appliedCropRect(crop);
  applyCropRect(bounds.x0, bounds.y0, bounds.x1, bounds.y1);
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
