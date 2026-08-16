// Левая полоса кисти: размер сверху, пипетка по центру, прозрачность снизу.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $ } from '../core/dom.js';
import { brushKey } from '../core/tools.js';
import { doUndo, doRedo } from '../core/history.js';
import { saveBrushPrefs } from '../core/brush-prefs.js';
import { BP_SMAX, BP_SIZE_CURVE } from '../config/limits.js';
import { clamp01, clampRound } from '../logic/math.js';
import { nextFloatingZ } from '../core/floating-window.js';

const curBrush = brushKey;
const clampSize = (v) => clampRound(v, 1, BP_SMAX);
export const sizeFromFrac = (f) => clampSize(1 + Math.pow(clamp01(f), BP_SIZE_CURVE) * (BP_SMAX - 1));
export const fracFromSize = (s) => Math.pow((clampSize(s) - 1) / (BP_SMAX - 1), 1 / BP_SIZE_CURVE);

function vslPos(fillId, knobId, frac) { const f = Math.max(0, Math.min(1, frac)), knob = $(knobId), sl = knob.parentElement;
  $(fillId).style.height = f * 100 + '%'; knob.style.bottom = Math.max(0, (sl.clientHeight - knob.offsetHeight) * f) + 'px'; }

export function syncBars() { const b = S.brushes[curBrush()];
  vslPos('bp-size-fill', 'bp-size-knob', fracFromSize(b.size));
  vslPos('bp-op-fill', 'bp-op-knob', b.op); }

let bbValT = null;
function showBbVal(slId, txt) { const v = $('bb-val'), r = $(slId).getBoundingClientRect();
  v.textContent = txt; v.style.left = (r.right + 8) + 'px'; v.style.top = r.top + r.height / 2 + 'px'; v.classList.add('on');
  clearTimeout(bbValT); bbValT = setTimeout(() => v.classList.remove('on'), 700); }

function vslDrag(slId, onFrac) { const sl = $(slId); let on = false;
  const set = (e) => { const r = sl.getBoundingClientRect(); onFrac(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))); };
  sl.addEventListener('pointerdown', (e) => { on = true; sl.setPointerCapture(e.pointerId); set(e); });
  sl.addEventListener('pointermove', (e) => { if (on) set(e); });
  const end = () => { on = false; }; sl.addEventListener('pointerup', end); sl.addEventListener('pointercancel', end); }

function setSize(size, show = false) { const b = S.brushes[curBrush()];
  b.size = clampSize(size); saveBrushPrefs(S); syncBars();
  if (show) showBbVal('bp-size-sl', b.size + ' px');
  bus.emit('brush'); bus.emit('render'); }

export function mount() {
  $('brushbar').addEventListener('pointerdown', () => { $('brushbar').style.zIndex = nextFloatingZ(); }, true); // в общий порядок: тронули — наверх
  vslDrag('bp-size-sl', (f) => setSize(sizeFromFrac(f), true));
  vslDrag('bp-op-sl', (f) => { S.brushes[curBrush()].op = Math.max(0, Math.min(1, f));
    saveBrushPrefs(S); syncBars(); showBbVal('bp-op-sl', Math.round(S.brushes[curBrush()].op * 100) + '%'); });
  $('bb-undo').onclick = doUndo; $('bb-redo').onclick = doRedo; // bb-pick — кнопка пипетки: клик/удержание ведёт Eyedropper System
  window.addEventListener('resize', syncBars);
  bus.on('tool', syncBars);
  bus.on('brush', syncBars); // живое обновление ползунка при жесте Brush Size Modifier
  bus.on('brushlib', syncBars); // размер мог поменяться (кисть из выделения)
  syncBars();
}

actions.register('brush.smaller', () => setSize(S.brushes[curBrush()].size - 1, true));
actions.register('brush.bigger', () => setSize(S.brushes[curBrush()].size + 1, true));
