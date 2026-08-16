// Монохром: оттенки серого по яркости (Rec. 601), альфа сохраняется.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { dirtyAll } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';

const lum = (c) => Math.round(c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114);

export function toMono(L) { const g = L.grid;
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = g[y][x]; if (!c) continue;
    const v = lum(c); g[y][x] = c.length > 3 ? [v, v, v, c[3]] : [v, v, v]; }
  for (const [k, c] of L.ext) { const v = lum(c); L.ext.set(k, c.length > 3 ? [v, v, v, c[3]] : [v, v, v]); } }

export function monoLayer(L) { snapshot(); toMono(L); dirtyAll(); bus.emitDoc(); toast(t('toast.layerMono')); }
export function monoAll() { snapshot(); for (const L of S.layers) toMono(L); dirtyAll(); bus.emitDoc(); toast(t('toast.monoAll')); }

export function monoTargets(targets) { snapshot(); for (const L of targets) toMono(L); dirtyAll(); bus.emitDoc(); toast(t('toast.mono')); }
actions.register('effect.mono', (targets) => (targets && targets.length) ? monoTargets(targets) : monoAll());
