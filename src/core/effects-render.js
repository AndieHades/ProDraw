import { alphaMask, effectRegionFromMask } from '../logic/effect-surface-region.js';
import { buildCanvasEffectSurface, buildCanvasEffects,
  folderEffectSurface, visibleAdjustments, visibleColorEffects,
  visibleMonochromes, visiblePixelEffects } from './effect-canvas.js';
import { layerEffectSource } from './effect-layer-source.js';
import { createEffectSurface, drawEffectSurface, materializeEffectSurface,
  unionEffectBounds } from './effect-surface.js';
import { layerRev } from './layer-cache.js';
import { effVis, folderChain } from './layers.js';
import { S } from './state.js';

const effectsFor = (target) => {
  const base = target.effects || [], draft = S.fxDraft;
  return draft && draft.target === target && !base.includes(draft.eff)
    ? [...base, draft.eff] : base;
};

export const layerEffectsFor = (layer) => effectsFor(layer);
export const folderEffectsFor = (folder) => effectsFor(folder);
export { visibleAdjustments, visibleColorEffects, visiblePixelEffects };
export function layerAdjustmentEffects(index) {
  const layer = S.layers[index]; if (!layer) return [];
  const result = [];
  for (const folder of folderChain(layer.fid).slice().reverse()) {
    result.push(...visibleAdjustments(folderEffectsFor(folder)));
  }
  result.push(...visibleAdjustments(layerEffectsFor(layer))); return result;
}

export function layerRenderEffects(index) {
  const layer = S.layers[index]; if (!layer) return [];
  const result = [];
  for (const folder of folderChain(layer.fid).slice().reverse()) {
    result.push(...visibleColorEffects(folderEffectsFor(folder)));
  }
  result.push(...layerEffectsFor(layer)); return result;
}

const floatingSignature = (index) => {
  const floating = S.selFloat && (S.selFloat.li ?? S.cur) === index ? S.selFloat : null;
  if (!floating) return '';
  return floating.symItems ? `|f${floating.dx},${floating.dy}`
    : `|f${floating.x},${floating.y},${floating.w},${floating.h}`;
};

const plainCache = new Map();
export function layerPlainSurface(index) {
  const signature = `${S.W}x${S.H}|${layerRev(index)}${floatingSignature(index)}`;
  const hit = plainCache.get(index); if (hit?.signature === signature) return hit.surface;
  const surface = layerEffectSource(index);
  plainCache.set(index, { signature, surface }); return surface;
}

const layerCache = new Map();
export function layerFxSurface(index) {
  const effects = layerRenderEffects(index);
  const signature = `${S.W}x${S.H}|${layerRev(index)}|${JSON.stringify(effects)}` +
    floatingSignature(index);
  const hit = layerCache.get(index); if (hit?.signature === signature) return hit.surface;
  const surface = buildCanvasEffectSurface(layerEffectSource(index), effects,
    documentBounds());
  layerCache.set(index, { signature, surface }); return surface;
}

const materializedLayers = new WeakMap();
export function layerFxCanvas(index) {
  const surface = layerFxSurface(index), hit = materializedLayers.get(surface);
  if (hit?.width === S.W && hit?.height === S.H) return hit;
  const canvas = materializeEffectSurface(surface, S.W, S.H);
  materializedLayers.set(surface, canvas); return canvas;
}

const documentBounds = () => ({ minx: 0, miny: 0, maxx: S.W - 1, maxy: S.H - 1 });

export function layerMoveCanvas(index, dx, dy) {
  const source = layerEffectSource(index, dx, dy, true);
  const effects = layerRenderEffects(index);
  return effects.length ? buildCanvasEffectSurface(source, effects, documentBounds()) : source;
}

export function fxOnCanvas(source, effects, width, height) {
  return effects?.length ? buildCanvasEffects(source, effects, width, height) : source;
}

const inFolder = (layer, id) => folderChain(layer.fid).some((folder) => folder.id === id);

function groupSurface(id) {
  const entries = []; let bounds = null;
  for (let index = 0; index < S.layers.length; index++) {
    const layer = S.layers[index];
    if (!inFolder(layer, id) || !effVis(index) || layer.opacity <= 0 || layer.clip) continue;
    const surface = layerRenderEffects(index).length
      ? layerFxSurface(index) : layerPlainSurface(index);
    if (!surface.bounds) continue;
    entries.push({ layer, surface }); bounds = unionEffectBounds(bounds, surface.bounds);
  }
  const output = createEffectSurface(bounds); if (!bounds) return output;
  const context = output.canvas.getContext('2d'); context.imageSmoothingEnabled = false;
  for (const { layer, surface } of entries) {
    context.globalAlpha = layer.opacity;
    drawEffectSurface(context, surface, -output.origin.x, -output.origin.y);
  }
  context.globalAlpha = 1; return output;
}

function memberSignature(id) {
  let signature = '';
  for (let index = 0; index < S.layers.length; index++) {
    if (!inFolder(S.layers[index], id)) continue;
    signature += `${index}:${layerRev(index)}:${JSON.stringify(layerRenderEffects(index))};`;
  }
  return signature;
}

const folderCache = new Map();
export function folderFx(folder, which) {
  const effects = folderEffectsFor(folder), pixels = visiblePixelEffects(effects);
  if (!pixels.some((effect) => which === 'above'
    ? effect.type === 'innerShadow' : effect.type !== 'innerShadow')) return null;
  const key = `${folder.id}|${which}`;
  const inherited = folderChain(folder.id).slice().reverse().flatMap((item) =>
    visibleMonochromes(folderEffectsFor(item)));
  const rendered = [...pixels, ...inherited];
  const signature = `${S.W}x${S.H}|${memberSignature(folder.id)}|${JSON.stringify(rendered)}`;
  const hit = folderCache.get(key); if (hit?.signature === signature) return hit.surface;
  const surface = folderEffectSurface(groupSurface(folder.id), rendered,
    which, documentBounds());
  folderCache.set(key, { signature, surface }); return surface;
}

export function targetEffectRegion(target, effect) {
  if (target.grid) {
    const source = layerEffectSource(S.layers.indexOf(target));
    if (!source.bounds) return null;
    const image = source.canvas.getContext('2d').getImageData(
      0, 0, source.canvas.width, source.canvas.height);
    return effectRegionFromMask(alphaMask(image.data, source.canvas.width,
      source.canvas.height), source.canvas.width, source.canvas.height,
    source.bounds, effect);
  }
  const source = groupSurface(target.id); if (!source.bounds) return null;
  const image = source.canvas.getContext('2d').getImageData(
    0, 0, source.canvas.width, source.canvas.height);
  return effectRegionFromMask(alphaMask(image.data, source.canvas.width,
    source.canvas.height), source.canvas.width, source.canvas.height,
  source.bounds, effect);
}
