import { S, G } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { $, showMenuForAnchor, t } from '../../ui/dom/ShellDom.ts';
import { setTool } from '../../core/tools.js';
import * as bus from '../../core/bus.ts';
import { ADJUST_MODES, ICONS } from '../../config/toolbar.ts';
import { strokeSeen } from './seen.ts';
import { recordPixelBefore } from '../../core/history.js';
import { adjustBrushColor } from '../../logic/AdjustBrushColor.ts';

const byMode = (mode) => ADJUST_MODES.find((m) => m.mode === mode) || ADJUST_MODES[0];
let mounted = false;

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

function writeCell(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  if (S.layers[S.cur].lock) return;
  const key = y * S.W + x; if (strokeSeen.has(key)) return; strokeSeen.add(key);
  const g = G(), c = g[y][x]; if (!c) return;
  recordPixelBefore(S.cur, x, y, c);
  g[y][x] = adjustBrushColor(c, S.adjMode, S.active, S.adjAmt);
  return true;
}

export function adjustCell(x, y) {
  if (writeCell(x, y)) markDirty(S.cur, { minx: x, miny: y, maxx: x, maxy: y });
}

export function adjustStamp(x, y) {
  const sz = S.pencilSize, off = sz >> 1, sa = symA(), sha = symHA();
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const put = (px, py) => { if (!writeCell(px, py)) return;
    if (px < minx) minx = px; if (px > maxx) maxx = px;
    if (py < miny) miny = py; if (py > maxy) maxy = py; };
  for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) { const xx = x - off + dx, yy = y - off + dy;
    put(xx, yy); const mx = S.W - 1 - xx, my = S.H - 1 - yy;
    if (sa && mx !== xx) put(mx, yy);
    if (sha && my !== yy) put(xx, my);
    if (sa && sha && mx !== xx && my !== yy) put(mx, my); }
  if (maxx >= minx) markDirty(S.cur, { minx, miny, maxx, maxy });
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
