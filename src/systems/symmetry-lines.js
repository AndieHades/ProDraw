import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $ } from '../core/dom.js';
import { registerGlobal } from '../core/canvas-handlers.js';
import { ensureSymmetryDefaults, resetSymmetryLine, symmetryConfig } from '../core/layers.js';
import { clamp } from '../logic/math.js';

const activeIds = () => ['x', 'y', 'd1', 'd2'].filter((id) => (id === 'x' ? S.sym : id === 'y' ? S.symH : id === 'd1' ? S.symD1 : S.symD2));
const cursorFor = (id) => id === 'x' ? 'ew-resize' : id === 'y' ? 'ns-resize' : id === 'd1' ? 'nesw-resize' : 'nwse-resize';

function point(e) {
  const r = $('cv').getBoundingClientRect(), z = S.view.zoom || 1;
  return {
    x: (e.clientX - r.left - S.view.ox) / z - 0.5,
    y: (e.clientY - r.top - S.view.oy) / z - 0.5,
    tol: Math.max(0.35, 9 / z),
  };
}

export function hitSymLine(e) {
  if (!S.symLines || !S.symLines.mode) return null;
  ensureSymmetryDefaults();
  const p = point(e), cfg = symmetryConfig();
  let best = null, bd = Infinity;
  const dist = {
    x: Math.abs(p.x - cfg.axisX),
    y: Math.abs(p.y - cfg.axisY),
    d1: Math.abs(p.y - p.x - cfg.diagP) / Math.SQRT2,
    d2: Math.abs(p.x + p.y - cfg.diagN) / Math.SQRT2,
  };
  for (const id of activeIds()) if (dist[id] < bd) { bd = dist[id]; best = id; }
  return best && bd <= p.tol ? best : null;
}

function setLineFromPoint(id, e) {
  ensureSymmetryDefaults();
  const p = point(e);
  if (id === 'x') S.symLines.x = clamp(p.x, 0, S.W - 1);
  else if (id === 'y') S.symLines.y = clamp(p.y, 0, S.H - 1);
  else if (id === 'd1') S.symLines.d1 = clamp(p.y - p.x, -(S.W - 1), S.H - 1);
  else if (id === 'd2') S.symLines.d2 = clamp(p.x + p.y, 0, S.W + S.H - 2);
}

let drag = null;

export function mount() {
  registerGlobal({
    hover: ({ e }) => {
      if (!S.symLines || !S.symLines.mode) return '';
      const hit = hitSymLine(e);
      if (S.symLines.hover !== hit) { S.symLines.hover = hit; bus.emit('render'); }
      return hit ? (S.symLines.mode === 'reset' ? 'pointer' : cursorFor(hit)) : '';
    },
    down: ({ e }) => {
      if (!S.symLines || !S.symLines.mode) return false;
      const hit = hitSymLine(e);
      if (!hit) return false;
      if (S.symLines.mode === 'reset') { resetSymmetryLine(hit); S.symLines.hover = hit; bus.emit('render'); return true; }
      drag = { id: hit }; setLineFromPoint(hit, e); S.symLines.hover = hit; bus.emit('render'); return true;
    },
    move: ({ e }) => { if (!drag) return; setLineFromPoint(drag.id, e); S.symLines.hover = drag.id; bus.emit('render'); },
    up: () => { drag = null; },
  });
}
