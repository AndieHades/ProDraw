// Индикатор размера документа и активной рамки (кроп, выделение, трансформ).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $ } from '../core/dom.js';

const selSize = (s) => (s ? [s.x1 - s.x0 + 1, s.y1 - s.y0 + 1] : null);
function activeSize() {
  const c = S.cropMode; if (c) return [c.x1 - c.x0 + 1, c.y1 - c.y0 + 1];
  const m = S.rotMode; if (m) return [Math.max(1, Math.round(m.b.w * Math.abs(m.sx))), Math.max(1, Math.round(m.b.h * Math.abs(m.sy)))];
  return selSize(S.sel);
}

function sync() { const el = $('status'); if (!el) return; const a = activeSize();
  el.textContent = S.W + '×' + S.H + (a ? ' → ' + a[0] + '×' + a[1] : '') + ' px';
  const zoom = $('zoom-status'); if (zoom) zoom.textContent = Math.round(S.view.zoom * 100) + '%'; }

export function mount() { bus.on('layers', sync); bus.on('fit', sync); bus.on('selection', sync); bus.on('render', sync); bus.on('overlay', sync); sync(); }
