import { S, G } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { $, showMenuForAnchor, t } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import * as bus from '../../core/bus.js';
import { ADJUST_MODES, ICONS } from '../../config/toolbar.js';
import { strokeSeen } from './seen.js';

const mix = (a, b, t) => Math.max(0, Math.min(255, Math.round(a + (b - a) * t)));
const byMode = (mode) => ADJUST_MODES.find((m) => m.mode === mode) || ADJUST_MODES[0];
let mounted = false;

function grayTarget(c) {
  const v = Math.round(c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114);
  return [v, v, v];
}

function targetColor(c) {
  if (S.adjMode === 'dodge') return [255, 255, 255];
  if (S.adjMode === 'burn') return [0, 0, 0];
  if (S.adjMode === 'mono') return grayTarget(c);
  return S.active;
}

function syncStrength() {
  const amt = $('adj-amt'), out = $('adj-amtv'); if (!amt || !out) return;
  amt.value = S.adjAmt; out.textContent = S.adjAmt + '%';
}

function syncButton() {
  const btn = $('t-adjust'), menu = $('adjust-choice'); if (!btn) return;
  const cfg = byMode(S.adjMode);
  btn.innerHTML = ICONS[cfg.icon]; btn.dataset.i18nTitle = cfg.key; btn.title = t(cfg.key);
  btn.classList.toggle('on', S.tool === 'adjust');
  if (!menu) return;
  for (const b of menu.querySelectorAll('button')) {
    const m = byMode(b.dataset.adjustMode); b.title = t(m.key);
    b.classList.toggle('on', b.dataset.adjustMode === cfg.mode);
  }
}

function showStrength() {
  syncStrength(); showMenuForAnchor($('adjpop'), $('t-adjust'));
}

function activateMode(mode, open = true) {
  S.adjMode = byMode(mode).mode; setTool('adjust'); syncButton();
  if (open) showStrength();
}

function buildChoice() {
  const menu = $('adjust-choice'); if (!menu || menu.dataset.ready) return;
  menu.dataset.ready = '1'; menu.innerHTML = '';
  for (const m of ADJUST_MODES) {
    const b = document.createElement('button');
    b.innerHTML = ICONS[m.icon]; b.dataset.adjustMode = m.mode; b.dataset.i18nTitle = m.key; b.title = t(m.key);
    b.onclick = () => activateMode(m.mode);
    menu.appendChild(b);
  }
}

export function adjustCell(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  if (S.layers[S.cur].lock) return;
  const key = y * S.W + x; if (strokeSeen.has(key)) return; strokeSeen.add(key);
  const g = G(), c = g[y][x]; if (!c) return;
  const a = c.length > 3 ? c[3] : 255, t = S.adjAmt / 100;
  const target = targetColor(c);
  g[y][x] = [mix(c[0], target[0], t), mix(c[1], target[1], t), mix(c[2], target[2], t), a]; markDirty(S.cur);
}

export function adjustStamp(x, y) {
  const sz = S.brushes.pencil.size, off = sz >> 1, sa = symA(), sha = symHA();
  for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) { const xx = x - off + dx, yy = y - off + dy;
    adjustCell(xx, yy); const mx = S.W - 1 - xx, my = S.H - 1 - yy;
    if (sa && mx !== xx) adjustCell(mx, yy);
    if (sha && my !== yy) adjustCell(xx, my);
    if (sa && sha && mx !== xx && my !== yy) adjustCell(mx, my); }
}

export function mount() {
  buildChoice(); syncStrength(); syncButton();
  const btn = $('t-adjust'); if (!btn) return;
  btn.onclick = () => activateMode(S.adjMode);
  if (mounted) return; mounted = true;
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault(); e.stopImmediatePropagation(); syncButton();
    showMenuForAnchor($('adjust-choice'), e.currentTarget);
  }, true);
  $('adj-amt').addEventListener('input', () => { S.adjAmt = +$('adj-amt').value; syncStrength(); });
  bus.on('tool', syncButton);
}
