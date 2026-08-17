import { S, blank } from './state.js';
import { activeTimeline, liveFrameId, saveActiveFrame } from './animation.js';
import { moveTextSource } from '../logic/text-model.js';
import { translateRaster } from '../logic/raster-remap.js';
import { rasterTilemap } from '../logic/tilemap-raster.js';
import { remappedLayer } from './document-layer-remap.js';
import { tileGrid } from './tileset.js';

const isTilemap = (L) => !!(L && L.kind === 'tilemap' && L.tilemap);

function rasterFrameTilemap(L, w, h) {
  const ts = S.tilesets.find((x) => x.id === L.tilemap.tilesetId); if (!ts) return;
  const map = rasterTilemap(L.tilemap, ts.tileW, ts.tileH, (id) => tileGrid(L.tilemap.tilesetId, id));
  const out = blank(w, h);
  for (let y = 0; y < map.length && y < h; y++) for (let x = 0; x < map[0].length && x < w; x++) out[y][x] = map[y][x];
  L.grid = out; L.ext = new Map();
}

function remapTilemap(L, x0, y0, newW, newH) {
  const ts = S.tilesets.find((x) => x.id === L.tilemap.tilesetId); if (!ts) return;
  const old = L.tilemap, mapW = Math.max(1, Math.ceil(newW / ts.tileW)), mapH = Math.max(1, Math.ceil(newH / ts.tileH));
  const dx = Math.round(x0 / ts.tileW), dy = Math.round(y0 / ts.tileH), cells = new Array(mapW * mapH).fill(null);
  for (let cy = 0; cy < old.mapH; cy++) for (let cx = 0; cx < old.mapW; cx++) {
    const cell = old.cells[cy * old.mapW + cx]; if (!cell) continue;
    const nx = cx - dx, ny = cy - dy; if (nx >= 0 && ny >= 0 && nx < mapW && ny < mapH) cells[ny * mapW + nx] = { ...cell };
  }
  L.tilemap = { ...old, mapW, mapH, cells }; rasterFrameTilemap(L, newW, newH);
}

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
    const next = remappedLayer(layer, raster,
      { moveText: (text) => moveTextSource(text, pl, pt) });
    if (isTilemap(next)) remapTilemap(next, -pl, -pt, newW, newH);
    return next;
  });
}

export function cropStoredFrames(x0, y0, oldW, oldH, newW, newH) {
  replaceStoredFrames((layer) => {
    const raster = translateRaster(layer.grid, layer.ext, -x0, -y0,
      newW, newH, { preserveGrid: true });
    const next = remappedLayer(layer, raster,
      { moveText: (text) => moveTextSource(text, -x0, -y0) });
    if (isTilemap(next)) remapTilemap(next, x0, y0, newW, newH);
    return next;
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
