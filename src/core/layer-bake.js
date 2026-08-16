// Запекание видимого результата набора слоёв в обычную grid-сетку.
// Используется merge: layer effects и clipping mask становятся пикселями слоя.
import { S, blank } from './state.js';
import { clipBase, effVis, folderChain } from './layers.js';
import { folderEffectsFor, layerEffectsFor } from './effects-render.js';
import { hexToRgb } from '../logic/color.js';
import { EFFECT_PIXELS, INNER_EFFECTS, maskFromGrid } from '../logic/layer-effects.js';
import { adjustColor } from '../logic/adjustment.js';
import { mergeCells } from '../logic/raster.js';

const alpha = (c) => (c ? (c.length > 3 ? c[3] : 255) : 0);
const inB = (x, y) => x >= 0 && y >= 0 && x < S.W && y < S.H;
const memberOf = (i, fid) => folderChain(S.layers[i].fid).some((f) => f.id === fid);
const folderVisible = (f) => folderChain(f.id).every((x) => x.visible);
const depth = (f) => folderChain(f.id).length;

function put(g, x, y, c, op = 1) { if (inB(x, y) && c && alpha(c) > 0) g[y][x] = mergeCells(g[y][x], c, op); }
function drawGrid(dst, src, op = 1) {
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) put(dst, x, y, src[y][x], op);
}

const visibleAdjustments = (effects = []) => effects.filter((e) => e.visible !== false && e.type === 'adjustment');
const visiblePixelEffects = (effects = []) => effects.filter((e) => e.visible !== false && EFFECT_PIXELS[e.type]);

function adjustedGrid(src, effects) {
  const adj = visibleAdjustments(effects); if (!adj.length) return src;
  const out = blank(S.W, S.H);
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
    let c = src[y][x]; if (!c) continue;
    c = c.slice(); for (const e of adj) c = adjustColor(c, e.params);
    out[y][x] = c; }
  return out;
}

function drawEffect(dst, mask, e, innerSrc = null) {
  const col = hexToRgb(e.params.color), pixels = EFFECT_PIXELS[e.type]?.(mask, S.W, S.H, e.params) || [];
  for (const [x, y, a] of pixels) {
    if (!inB(x, y)) continue;
    const sa = innerSrc ? Math.round(a * alpha(innerSrc[y][x]) / 255) : a;
    put(dst, x, y, [col[0], col[1], col[2], sa]);
  }
}

function layerGrid(i, inheritedAdjustments = []) { const L = S.layers[i], out = blank(S.W, S.H), effects = layerEffectsFor(L), mask = maskFromGrid(L.grid, S.W, S.H);
  for (const e of visiblePixelEffects(effects)) if (!INNER_EFFECTS.has(e.type)) drawEffect(out, mask, e);
  const src = adjustedGrid(L.grid, [...inheritedAdjustments, ...effects]);
  drawGrid(out, src);
  for (const e of visiblePixelEffects(effects)) if (INNER_EFFECTS.has(e.type)) drawEffect(out, mask, e, src);
  return out;
}

function clipToBase(g, base) {
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
    const c = g[y][x], ba = alpha(base[y][x]);
    if (!c || !ba) g[y][x] = null;
    else if (ba < 255 || alpha(c) < 255) g[y][x] = [c[0], c[1], c[2], Math.round(alpha(c) * ba / 255)];
  }
  return g;
}

function visibleLayerGrid(i, selected) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) return null;
  const cb = clipBase(i); if (L.clip) {
    if (cb < 0 || !selected.has(cb) || !effVis(cb)) return null;
    return clipToBase(layerGrid(i), S.layers[cb].grid);
  }
  return layerGrid(i);
}

export function bakeLayerIndices(idx) {
  const selected = new Set(idx), out = blank(S.W, S.H);
  for (const i of idx) { const g = visibleLayerGrid(i, selected); if (g) drawGrid(out, g, S.layers[i].opacity); }
  return out;
}

function folderGroupGrid(f, selected) { const out = blank(S.W, S.H);
  for (let i = 0; i < S.layers.length; i++) {
    const L = S.layers[i]; if (!selected.has(i) || !memberOf(i, f.id) || L.clip || !effVis(i) || L.opacity <= 0) continue;
    drawGrid(out, layerGrid(i), L.opacity);
  }
  return out;
}

function drawFolderEffects(dst, f, which, selected) {
  const eff = visiblePixelEffects(folderEffectsFor(f)).filter((e) => (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  if (!eff.length) return;
  const grp = folderGroupGrid(f, selected), mask = maskFromGrid(grp, S.W, S.H);
  for (const e of eff) drawEffect(dst, mask, e, which === 'above' ? grp : null);
}

function folderAdjustmentsForLayer(i, root) {
  const out = [];
  for (const f of folderChain(S.layers[i].fid).slice().reverse()) {
    if (!folderChain(f.id).some((x) => x.id === root.id)) continue;
    out.push(...visibleAdjustments(folderEffectsFor(f)));
  }
  return out;
}

function folderGroups(root, idx) { const selected = new Set(idx), groups = [];
  for (const f of S.folders) {
    if (!folderChain(f.id).some((x) => x.id === root.id) || !folderEffectsFor(f).length || !folderVisible(f)) continue;
    let bottom = Infinity, top = -1;
    for (const i of idx) if (selected.has(i) && memberOf(i, f.id)) { bottom = Math.min(bottom, i); top = Math.max(top, i); }
    if (top >= 0) groups.push({ f, bottom, top });
  }
  return groups;
}

export function bakeFolder(f) {
  const idx = S.layers.map((_, i) => i).filter((i) => memberOf(i, f.id)), selected = new Set(idx), out = blank(S.W, S.H);
  const groups = folderGroups(f, idx), byDepth = (a, b) => depth(a.f) - depth(b.f);
  for (const i of idx) {
    groups.filter((g) => g.bottom === i).sort(byDepth).forEach((g) => drawFolderEffects(out, g.f, 'below', selected));
    const L = S.layers[i]; let g = null;
    if (effVis(i) && L.opacity > 0) {
      if (L.clip) {
        const cb = clipBase(i);
        if (cb >= 0 && selected.has(cb) && effVis(cb)) g = clipToBase(layerGrid(i, folderAdjustmentsForLayer(i, f)), S.layers[cb].grid);
      } else g = layerGrid(i, folderAdjustmentsForLayer(i, f));
    }
    if (g) drawGrid(out, g, S.layers[i].opacity);
    groups.filter((g) => g.top === i).sort((a, b) => byDepth(b, a)).forEach((g) => drawFolderEffects(out, g.f, 'above', selected));
  }
  return { grid: out, idx };
}
