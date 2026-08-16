// Замена цвета по всему документу. Палитра сохраняет исходные цвета; новый цвет
// добавляется в конец, если его там ещё нет.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { eqc } from '../logic/color.js';
import { dirtyAll } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';
import { rasterizeMatchingText } from '../core/text-rasterize.js';

const fromList = (from) => (Array.isArray(from && from[0]) ? from : [from]).filter(Boolean).map((c) => c.slice(0, 3));

export function recolorAll(from, to) {
  const sources = fromList(from), target = to.slice(0, 3);
  if (!sources.length) return;
  snapshot(); rasterizeMatchingText(() => true); let n = 0;
  for (const L of S.layers) { const g = L.grid;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (g[y][x] && sources.some((f) => eqc(g[y][x], f))) { g[y][x] = target.slice(); n++; }
    for (const [k, c] of L.ext) if (sources.some((f) => eqc(c, f))) L.ext.set(k, target.slice()); }
  if (!S.palette.some((p) => eqc(p, target))) S.palette.push(target.slice());
  if (sources.some((f) => eqc(S.active, f))) S.active = target.slice();
  if (n) actions.run('color.used', target);
  dirtyAll(); bus.emit('palette'); bus.emit('render'); bus.emit('layers');
  toast(t('toast.recoloredN', { n }));
}

export function startReplace(from) { S.replaceMode = { from: Array.isArray(from && from[0]) ? from.map((c) => c.slice()) : from.slice() }; bus.emit('render'); toast(t('toast.replaceHint')); }

actions.register('recolor.all', recolorAll);
actions.register('recolor.start', startReplace);
