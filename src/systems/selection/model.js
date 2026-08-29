// Модель выделения: нормализация рамки, маски, операции над содержимым.
// Drag/перенос — в selection-input; здесь логика, не жесты.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { combineSelectionState, selectionMaskFromState, selectionStateFromMask,
  SelectionMask, symmetrizeSelectionMask } from '../../logic/mask-ops.js';
import { expandMask } from '../../logic/symmetry.ts';
import { eqc } from '../../logic/color.ts';
import { anySym, symmetryConfig } from '../../core/layers.js';
import { selectedLayerTargets } from '../../core/targets.js';
import { layerContentBounds } from '../../core/layer-cache.js';
import { toast, t } from '../../ui/dom/ShellDom.ts';
import { setTool } from '../../core/tools.js';
import { commitFloat } from './float.js';
import { fillSelection } from './content.js';

export { deleteSelContent, fillSelection, selHasPixels } from './content.js';

export function normSel(ax, ay, bx, by) { let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(S.W - 1, x1); y1 = Math.min(S.H - 1, y1);
  return (x1 < x0 || y1 < y0) ? null : { x0, y0, x1, y1 }; }

export function deselect() { commitFloat(); S.sel = null; S.selMask = null; bus.emit('selection'); bus.emit('render'); }

export function maskFromCells(cells) { const state = selectionStateFromMask(
  selectionMaskFromState(null, cells, S.W, S.H));
  if (!state) { deselect(); return; }
  S.sel = state.sel; S.selMask = state.mask; bus.emit('selection'); bus.emit('render'); }

// текущее выделение как множество клеток (рамка → все клетки рамки, маска → как есть)
export function selAsSet() { return S.sel ? selectionMaskFromState(S.sel, S.selMask, S.W, S.H) : null; }

// применить построенную маску с операцией (replace/add/subtract/intersect).
// Общая точка входа для всех инструментов выделения — не знает, как построен контур.
export function applySelectionOp(addition, op) { commitFloat();
  const add = expandMask(addition, S.W, S.H, false, false, symmetryConfig()); // симметрия: оригинал + зеркальные копии области
  const out = combineSelectionState(op === 'replace' ? null : S.sel,
    op === 'replace' ? null : S.selMask, add, op, S.W, S.H);
  if (!out || !out.size) { deselect(); return false; }
  maskFromCells(out); return true; }

// добавить зеркальные копии области выделения через общий mapper (без дублей логики)
export function symmetrizeSelection() { if (!S.sel || !anySym()) return;
  const base = selAsSet(), cfg = symmetryConfig();
  maskFromCells(symmetrizeSelectionMask(base, cfg)); }

export function selectColorPixels(color) {
  if (!S.layers[S.cur]) return;
  commitFloat();
  const colors = (Array.isArray(color?.[0]) ? color : [color]).filter(Boolean);
  const grid = G();
  const mask = new SelectionMask(S.W, S.H);
  const bounds = layerContentBounds(S.cur);
  if (bounds) {
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        const cell = grid[y][x];
        if (cell && colors.some((target) => eqc(cell, target))) mask.forceSelected(x, y);
      }
    }
  }
  if (!mask.size) {
    toast(t('toast.noColorOnLayer'));
    return;
  }
  maskFromCells(mask);
  setTool('select');
  toast(t('toast.selectedColorN', { n: mask.size }));
}

export function selectLayerContent() {
  commitFloat();
  const mask = new SelectionMask(S.W, S.H);
  for (const layer of selectedLayerTargets()) {
    const bounds = layerContentBounds(S.layers.indexOf(layer));
    if (!bounds) continue;
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        if (layer.grid[y][x]) mask.forceSelected(x, y);
      }
    }
  }
  if (!mask.size) {
    deselect();
    toast(t('toast.layerEmpty'));
    return;
  }
  setTool('select');
  maskFromCells(mask);
  toast(t('toast.selectedLayerN', { n: mask.size }));
}

export function invertSelection() { commitFloat();
  const mask = selectionMaskFromState(S.sel, S.selMask, S.W, S.H).inverted();
  if (!mask.size) { deselect(); toast(t('toast.invertAll')); return; }
  maskFromCells(mask); toast(t('toast.selInverted')); }

actions.register('selection.applyOp', applySelectionOp);
actions.register('selection.byColor', selectColorPixels);
actions.register('selection.layer', selectLayerContent);
actions.register('selection.invert', invertSelection);
actions.register('selection.fill', fillSelection);
