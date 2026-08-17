import { S, G } from '../../core/state.js';
import { layerContentBounds } from '../../core/layer-cache.js';
import { maskHas } from '../../core/selection.js';
import { SELECTION_FRAGMENT_DENSE_RATIO } from '../../config/selection-mask.js';
import { commitFloat } from './float.js';

function visitSelectedPaint(callback) {
  const bounds = layerContentBounds(S.cur);
  if (!bounds) return;
  const area = S.sel ? {
    minx: Math.max(bounds.minx, S.sel.x0),
    miny: Math.max(bounds.miny, S.sel.y0),
    maxx: Math.min(bounds.maxx, S.sel.x1),
    maxy: Math.min(bounds.maxy, S.sel.y1),
  } : bounds;
  if (area.minx > area.maxx || area.miny > area.maxy) return;
  const grid = G();
  for (let y = area.miny; y <= area.maxy; y++) {
    for (let x = area.minx; x <= area.maxx; x++) {
      const color = grid[y][x];
      if (color && (!S.sel || maskHas(S.selMask, x, y))) callback(x, y, color);
    }
  }
}

function measureFragment() {
  const bounds = { minx: S.W, miny: S.H, maxx: -1, maxy: -1 };
  let count = 0;
  visitSelectedPaint((x, y) => {
    count++;
    bounds.minx = Math.min(bounds.minx, x);
    bounds.miny = Math.min(bounds.miny, y);
    bounds.maxx = Math.max(bounds.maxx, x);
    bounds.maxy = Math.max(bounds.maxy, y);
  });
  return count ? { count, bounds } : null;
}

function denseFragment(measure, baseX, baseY) {
  const { bounds } = measure;
  const width = bounds.maxx - bounds.minx + 1;
  const height = bounds.maxy - bounds.miny + 1;
  const rows = Array.from({ length: height }, () => new Array(width).fill(null));
  visitSelectedPaint((x, y, color) => {
    rows[y - bounds.miny][x - bounds.minx] = color.slice();
  });
  return {
    kind: 'dense',
    offsetX: bounds.minx - baseX,
    offsetY: bounds.miny - baseY,
    rows,
  };
}

function sparseFragment(measure, baseX, baseY) {
  const { bounds } = measure;
  const cells = [];
  visitSelectedPaint((x, y, color) => {
    cells.push([x - bounds.minx, y - bounds.miny, color.slice()]);
  });
  return {
    kind: 'sparse',
    offsetX: bounds.minx - baseX,
    offsetY: bounds.miny - baseY,
    cells,
  };
}

export function captureSelectionFragment() {
  commitFloat();
  const measure = measureFragment();
  if (!measure) return { kind: 'sparse', offsetX: 0, offsetY: 0, cells: [] };
  const baseX = S.sel?.x0 ?? 0;
  const baseY = S.sel?.y0 ?? 0;
  const area = (measure.bounds.maxx - measure.bounds.minx + 1) *
    (measure.bounds.maxy - measure.bounds.miny + 1);
  return measure.count / area >= SELECTION_FRAGMENT_DENSE_RATIO
    ? denseFragment(measure, baseX, baseY)
    : sparseFragment(measure, baseX, baseY);
}

export function pasteFragment(fragment, grid, anchorX, anchorY, width, height) {
  const originX = anchorX + fragment.offsetX;
  const originY = anchorY + fragment.offsetY;
  let count = 0, bounds = null;
  const put = (x, y, color) => {
    const targetX = originX + x;
    const targetY = originY + y;
    if (targetX < 0 || targetY < 0 || targetX >= width || targetY >= height) return;
    grid[targetY][targetX] = color.slice();
    if (!bounds) bounds = { minx: targetX, miny: targetY, maxx: targetX, maxy: targetY };
    else { bounds.minx = Math.min(bounds.minx, targetX); bounds.miny = Math.min(bounds.miny, targetY);
      bounds.maxx = Math.max(bounds.maxx, targetX); bounds.maxy = Math.max(bounds.maxy, targetY); }
    count++;
  };
  if (fragment.kind === 'dense') {
    for (let y = 0; y < fragment.rows.length; y++) {
      for (let x = 0; x < fragment.rows[y].length; x++) {
        const color = fragment.rows[y][x];
        if (color) put(x, y, color);
      }
    }
  } else {
    for (const [x, y, color] of fragment.cells) put(x, y, color);
  }
  return { count, bounds };
}
