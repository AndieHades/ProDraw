// Мгновенные Flip/Rotate для активного пиксельного выделения.
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import { commitFloat } from './selection/float.js';
import { transformPixelSelection } from './selection/pixel-transform.js';

function rotPointInRect(x, y, r) {
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  const lx = x - r.x0, ly = y - r.y0;
  const dx = Math.round((w - h) / 2), dy = Math.round((h - w) / 2);
  return [r.x0 + h - 1 - ly + dx, r.y0 + lx + dy];
}

export function flipSelection(horiz) {
  if (!S.sel || !S.layers[S.cur]) return false;
  commitFloat();
  const L = S.layers[S.cur];
  if (!transformPixelSelection(L,
    (x, y, r) => (horiz ? [r.x1 - (x - r.x0), y] : [x, r.y1 - (y - r.y0)]))) return false;
  bus.emit('selection'); bus.emit('render'); bus.emit('layers'); return true;
}

export function rotateSelection() {
  if (!S.sel || !S.layers[S.cur]) return false;
  commitFloat();
  const L = S.layers[S.cur];
  if (!transformPixelSelection(L, rotPointInRect)) return false;
  bus.emit('selection'); bus.emit('render'); bus.emit('layers'); return true;
}
