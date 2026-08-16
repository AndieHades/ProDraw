import { S, blank } from './state.js';
import { activeTimeline, liveFrameId, saveActiveFrame } from './animation.js';
import { parseKey } from '../logic/raster.js';
import { isTextLayer, moveTextSource } from '../logic/text-model.js';
import { rasterTilemap } from '../logic/tilemap-raster.js';
import { tileGrid } from './tileset.js';

const isTilemap = (L) => !!(L && L.kind === 'tilemap' && L.tilemap);
const bump = (fr) => { fr.rev = (fr.rev || 0) + 1; };

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

function eachStoredFrame(fn) {
  const anim = S.animator; if (!anim) return;
  const skip = liveFrameId();
  saveActiveFrame();
  for (const id of Object.keys(anim.frames)) {
    if (id === skip) continue;
    fn(anim.frames[id]); bump(anim.frames[id]);
  }
}

export function expandStoredFrames(pl, pt, oldW, oldH, newW, newH) {
  eachStoredFrame((fr) => {
    for (const L of fr.layers) {
      const out = Array.from({ length: newH }, () => new Array(newW).fill(null));
      for (let y = 0; y < oldH; y++) for (let x = 0; x < oldW; x++) {
        const c = L.grid[y] && L.grid[y][x]; if (c) out[y + pt][x + pl] = c;
      }
      const ne = new Map();
      for (const [k, c] of L.ext || []) {
        const [kx, ky] = parseKey(k), ax = kx + pl, ay = ky + pt;
        if (ax >= 0 && ay >= 0 && ax < newW && ay < newH) out[ay][ax] = c; else ne.set(ax + ',' + ay, c);
      }
      L.grid = out; L.ext = ne; if (isTextLayer(L)) L.text = moveTextSource(L.text, pl, pt);
      if (isTilemap(L)) remapTilemap(L, -pl, -pt, newW, newH);
    }
  });
}

export function cropStoredFrames(x0, y0, oldW, oldH, newW, newH) {
  eachStoredFrame((fr) => {
    for (const L of fr.layers) {
      const out = Array.from({ length: newH }, () => new Array(newW).fill(null)), ne = new Map();
      for (let y = 0; y < oldH; y++) for (let x = 0; x < oldW; x++) {
        const c = L.grid[y] && L.grid[y][x]; if (!c) continue;
        const nx = x - x0, ny = y - y0;
        if (nx >= 0 && ny >= 0 && nx < newW && ny < newH) out[ny][nx] = c; else ne.set(nx + ',' + ny, c);
      }
      for (const [k, c] of L.ext || []) {
        const [kx, ky] = parseKey(k), ax = kx - x0, ay = ky - y0;
        if (ax >= 0 && ay >= 0 && ax < newW && ay < newH) { if (!out[ay][ax]) out[ay][ax] = c; } else ne.set(ax + ',' + ay, c);
      }
      L.grid = out; L.ext = ne; if (isTextLayer(L)) L.text = moveTextSource(L.text, -x0, -y0);
      if (isTilemap(L)) remapTilemap(L, x0, y0, newW, newH);
    }
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
