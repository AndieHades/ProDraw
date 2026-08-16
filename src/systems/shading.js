// Shading ramp: a compact Aseprite-like ink mode driven by a selected palette
// range. The ramp order is the brush direction; clicking it reverses direction.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, t, toast } from '../core/dom.js';
import { floatingWindow } from '../core/floating-window.js';
import { setTool } from '../core/tools.js';
import { rgb, rgbToHex, eqc } from '../logic/color.js';

export const SHADING_MAX = 6;

const clean = (colors) => {
  const out = [];
  for (const c of colors || []) {
    const v = c && c.slice(0, 3);
    if (v && !out.some((x) => eqc(x, v))) out.push(v);
    if (out.length >= SHADING_MAX) break;
  }
  return out;
};

const state = () => {
  S.shading ||= {};
  S.shading.colors ||= [];
  S.shading.on = !!S.shading.on;
  S.shading.open = !!S.shading.open;
  S.shading.picking = !!S.shading.picking;
  return S.shading;
};

export const hasRamp = () => state().colors.length > 1;
export const active = () => hasRamp() && !!state().on;
export const ramp = () => (hasRamp() ? state().colors : []);

function render() {
  const box = $('shade-list'); if (!box) return;
  const sh = state();
  box.innerHTML = '';
  for (const c of ramp()) {
    const b = document.createElement('button');
    b.className = 'shade-sw';
    b.style.background = rgb(c);
    b.title = rgbToHex(c).toUpperCase();
    b.onclick = reverse;
    box.appendChild(b);
  }
  $('shade-pop').classList.toggle('on', sh.open);
  $('shade-pick').classList.toggle('on', sh.picking);
}

function changed() { bus.emit('shading'); }

export function setRamp(colors, opts = {}) {
  const sh = state();
  const next = clean(colors);
  sh.colors = next;
  sh.open = true;
  sh.picking = false;
  sh.on = next.length > 1 ? opts.enable !== false : false;
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
}

export function reverse() {
  if (!active()) return;
  const sh = state();
  sh.colors = sh.colors.slice().reverse();
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
}

export function clear() {
  S.shading = { colors: [], on: false, open: false, picking: false };
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
}

export function close() {
  const sh = state();
  if (!sh.on && !sh.open && !sh.picking) return;
  sh.on = false; sh.open = false; sh.picking = false;
  actions.run('palette.clearSelection');
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
}

export function open() {
  const sh = state();
  sh.open = true;
  if (hasRamp()) sh.on = true;
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
}

export function enable() {
  if (!hasRamp()) return false;
  const sh = state();
  sh.on = true; sh.open = false; sh.picking = false;
  actions.run('palette.clearSelection');
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
  return true;
}

export function disable() {
  const sh = state();
  if (!sh.on && !sh.open && !sh.picking) return;
  sh.on = false; sh.open = false; sh.picking = false;
  actions.run('palette.clearSelection');
  render();
  changed();
  bus.emit('palette');
  bus.emit('render');
}

export function enablePick() {
  const sh = state();
  sh.open = true; sh.picking = true;
  actions.run('palette.clearSelection');
  render();
  changed();
  bus.emit('palette');
  toast(t('toast.shadingPickColors'));
}

export function activateTool(colors = []) {
  if (active()) { disable(); return true; }
  const next = clean(colors);
  if (next.length < 2) return false;
  setTool('pencil');
  setRamp(next);
  return true;
}

export function mount() {
  $('shade-title').textContent = t('shade.title');
  floatingWindow($('shade-pop'), { grip: $('shade-head'), handle: $('shade-rsz'), storeKey: 'shadewin', minW: 160, minH: 70,
    onClose: close,
    onResize: (w) => { $('shade-pop').style.width = Math.max(160, Math.min(innerWidth - 12, w)) + 'px'; } });
  $('shade-pick').onclick = enablePick;
  bus.on('locale', () => { $('shade-title').textContent = t('shade.title'); });
  bus.on('tool', (id) => { if (id !== 'pencil') close(); });
  bus.on('palette', render);
  actions.register('shading.setRamp', setRamp);
  actions.register('shading.clear', clear);
  actions.register('shading.close', close);
  actions.register('shading.open', open);
  actions.register('shading.enable', enable);
  actions.register('shading.disable', disable);
  actions.register('shading.pickColors', enablePick);
  actions.register('shading.reverse', reverse);
  actions.register('tool.shading', activateTool);
}
