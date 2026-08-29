import { S } from './state.js';
import { activeTimeline, liveFrameId, saveActiveFrame } from './animation.js';
import { moveTextSource } from '../logic/text-model.ts';
import { translateRaster } from '../logic/raster-remap.js';
import { remappedLayer } from './document-layer-remap.js';

function replaceStoredFrames(remap) {
  const anim = S.animator; if (!anim) return;
  const skip = liveFrameId();
  anim.frames = { ...anim.frames };
  saveActiveFrame();
  const next = {};
  for (const id of Object.keys(anim.frames)) {
    const frame = anim.frames[id];
    next[id] = id === skip ? frame : { ...frame,
      layers: frame.layers.map(remap), rev: (frame.rev || 0) + 1 };
  }
  anim.frames = next;
}

export function expandStoredFrames(pl, pt, oldW, oldH, newW, newH) {
  replaceStoredFrames((layer) => {
    const raster = translateRaster(layer.grid, layer.ext, pl, pt, newW, newH);
    return remappedLayer(layer, raster,
      { moveText: (text) => moveTextSource(text, pl, pt) });
  });
}

export function cropStoredFrames(x0, y0, oldW, oldH, newW, newH) {
  replaceStoredFrames((layer) => {
    const raster = translateRaster(layer.grid, layer.ext, -x0, -y0,
      newW, newH, { preserveGrid: true });
    return remappedLayer(layer, raster,
      { moveText: (text) => moveTextSource(text, -x0, -y0) });
  });
}

export function activeTimelineBounds(boundsFn, fallback) {
  const tl = activeTimeline(); if (!tl || !S.animator) return fallback();
  saveActiveFrame();
  let out = null;
  for (const id of tl.frameIds) {
    const fr = S.animator.frames[id]; if (!fr) continue;
    const b = boundsFn(fr.layers, fr.folders); if (!b) continue;
    out = out ? { minx: Math.min(out.minx, b.minx), miny: Math.min(out.miny, b.miny), maxx: Math.max(out.maxx, b.maxx), maxy: Math.max(out.maxy, b.maxy) } : b;
  }
  return out;
}
