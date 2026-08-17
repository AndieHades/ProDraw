// Bounded merge bake: effects and clipping become pixels without W×H scratch grids.
import { S, blank } from './state.js';
import { clipBase, effVis, folderChain } from './layers.js';
import { folderEffectsFor, layerEffectsFor } from './effects-render.js';
import { INNER_EFFECTS } from '../logic/layer-effects.js';
import { bakeGrid, clipGridToAlpha, drawBoundedGrid,
  drawEffectGrid, pixelEffects, applyMonochromeEffects } from './layer-bake-grid.js';

const memberOf = (i, fid) => folderChain(S.layers[i].fid).some((f) => f.id === fid);
const folderVisible = (f) => folderChain(f.id).every((x) => x.visible);
const depth = (f) => folderChain(f.id).length;
const visibleColorEffects = (effects = []) => effects.filter((effect) =>
  effect.visible !== false && ['adjustment', 'monochrome'].includes(effect.type));
const layerGrid = (i, inherited = []) => bakeGrid(S.layers[i].grid,
  layerEffectsFor(S.layers[i]), inherited, S.W, S.H);

function visibleLayerGrid(i, selected) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) return null;
  const cb = clipBase(i); if (L.clip) {
    if (cb < 0 || !selected.has(cb) || !effVis(cb)) return null;
    return clipGridToAlpha(layerGrid(i), S.layers[cb].grid, S.W, S.H);
  }
  return layerGrid(i);
}

export function bakeLayerIndices(idx) {
  const selected = new Set(idx), out = blank(S.W, S.H);
  for (const i of idx) { const grid = visibleLayerGrid(i, selected);
    if (grid) drawBoundedGrid(out, grid, S.layers[i].opacity, S.W, S.H); }
  return out;
}

function folderColorEffects(fid, root) { const out = [];
  for (const folder of folderChain(fid).slice().reverse()) {
    if (folderChain(folder.id).some((item) => item.id === root.id))
      out.push(...visibleColorEffects(folderEffectsFor(folder)));
  }
  return out;
}

function folderGroupGrid(f, selected, root) { const out = blank(S.W, S.H);
  for (let i = 0; i < S.layers.length; i++) {
    const L = S.layers[i]; if (!selected.has(i) || !memberOf(i, f.id) || L.clip || !effVis(i) || L.opacity <= 0) continue;
    drawBoundedGrid(out, layerGrid(i, folderColorEffects(L.fid, root)),
      L.opacity, S.W, S.H);
  }
  return out;
}

function relativeOpacity(folder, root) { let opacity = 1;
  for (const item of folderChain(folder.id)) { opacity *= item.opacity ?? 1;
    if (item.id === root.id) break; }
  return opacity;
}

function drawFolderEffects(dst, f, which, selected, root) {
  const eff = pixelEffects(folderEffectsFor(f)).filter((e) =>
    (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  if (!eff.length) return;
  const group = folderGroupGrid(f, selected, root), output = blank(S.W, S.H);
  for (const effect of eff) drawEffectGrid(output, group, effect, S.W, S.H,
    which === 'above' ? group : null);
  applyMonochromeEffects(output, folderColorEffects(f.id, root));
  drawBoundedGrid(dst, output, relativeOpacity(f, root), S.W, S.H);
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
    groups.filter((g) => g.bottom === i).sort(byDepth).forEach((g) =>
      drawFolderEffects(out, g.f, 'below', selected, f));
    const L = S.layers[i]; let g = null;
    if (effVis(i) && L.opacity > 0) {
      if (L.clip) {
        const cb = clipBase(i);
        if (cb >= 0 && selected.has(cb) && effVis(cb)) g = clipGridToAlpha(
          layerGrid(i, folderColorEffects(L.fid, f)), S.layers[cb].grid, S.W, S.H);
      } else g = layerGrid(i, folderColorEffects(L.fid, f));
    }
    if (g) drawBoundedGrid(out, g, L.opacity * relativeOpacity(
      S.folders.find((folder) => folder.id === L.fid) || f, f), S.W, S.H);
    groups.filter((g) => g.top === i).sort((a, b) => byDepth(b, a)).forEach((g) =>
      drawFolderEffects(out, g.f, 'above', selected, f));
  }
  return { grid: out, idx };
}
