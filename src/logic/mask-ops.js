import {
  cellsSelectionMask,
  isSelectionMask,
  rectangleSelectionMask,
} from './selection-mask.js';

export const SEL_OPS = ['replace', 'add', 'subtract', 'intersect'];

const pointFromKey = (key) => Array.isArray(key) ? key : key.split(',').map(Number);

export function selectionMaskFromState(sel, mask, width, height) {
  if (mask) return cellsSelectionMask(mask, width, height);
  return sel
    ? rectangleSelectionMask(sel, width, height)
    : cellsSelectionMask(null, width, height);
}

export function selectionStateFromMask(mask) {
  if (!mask?.size) return null;
  if (mask.size === mask.width * mask.height) {
    return {
      sel: { x0: 0, y0: 0, x1: mask.width - 1, y1: mask.height - 1 },
      mask: null,
    };
  }
  return { sel: mask.bounds(), mask: mask.isPlainRectangle() ? null : mask };
}

export function combineSelectionState(sel, mask, addition, op, width, height) {
  if (op === 'replace' || !sel) return cellsSelectionMask(addition, width, height);
  const base = selectionMaskFromState(sel, mask, width, height);
  const incoming = isSelectionMask(addition)
    ? addition.points()
    : addition;
  if (op === 'intersect') {
    const output = cellsSelectionMask(null, width, height);
    for (const key of incoming) {
      const point = pointFromKey(key);
      if (base.hasXY(point[0], point[1])) output.forceSelected(point[0], point[1]);
    }
    return output;
  }
  for (const key of incoming) {
    const point = pointFromKey(key);
    if (op === 'add') base.forceSelected(point[0], point[1]);
    else if (op === 'subtract') base.forceUnselected(point[0], point[1]);
  }
  return base;
}

export function combineMask(base, addition, op) {
  const compact = isSelectionMask(base) ? base : isSelectionMask(addition) ? addition : null;
  if (!compact) {
    if (op === 'replace' || !base) return new Set(addition);
    if (op === 'add') return new Set([...base, ...addition]);
    if (op === 'subtract') return new Set([...base].filter((key) => !addition.has(key)));
    if (op === 'intersect') return new Set([...addition].filter((key) => base.has(key)));
    return new Set(addition);
  }
  const selected = base ? selectionStateFromMask(cellsSelectionMask(base,
    compact.width, compact.height)) : null;
  return combineSelectionState(selected?.sel, selected?.mask, addition, op,
    compact.width, compact.height);
}

export { selectionBoundaryEdges } from './selection-boundary.js';
export { mapSelectionMask } from './selection-mask-map.js';
export {
  cloneSelectionMask,
  resizeSelectionMask,
  shiftSelectionMask,
  symmetrizeSimpleSelectionMask,
} from './selection-mask-transform.js';
export { symmetrizeSelectionMask } from './selection-symmetry.js';
export {
  cellsSelectionMask,
  isSelectionMask,
  SelectionMask,
  selectionMaskStats,
} from './selection-mask.js';
