import { S } from './state.js';
import { boundsWithExt } from '../logic/raster.js';
import { effectReach } from '../logic/layer-effects.js';

const grow = (b, r) => ({ minx: b.minx - r.l, miny: b.miny - r.t, maxx: b.maxx + r.r, maxy: b.maxy + r.b });
const merge = (a, b) => (a ? { minx: Math.min(a.minx, b.minx), miny: Math.min(a.miny, b.miny), maxx: Math.max(a.maxx, b.maxx), maxy: Math.max(a.maxy, b.maxy) } : b);

function folderChainFor(folders, fid) {
  const out = []; let id = fid;
  while (id != null) { const f = folders.find((x) => x.id === id); if (!f) break; out.push(f); id = f.parent ?? null; }
  return out;
}

export function boundsFor(layers = S.layers, folders = S.folders) {
  let out = null;
  const add = (b) => { if (b) out = merge(out, b); };
  for (const layer of layers) {
    let b = boundsWithExt(layer.grid, layer.ext);
    if (!b) continue;
    if (layer.effects && layer.effects.length) b = grow(b, effectReach(layer.effects));
    add(b);
  }
  for (const folder of folders) {
    if (!folder.effects || !folder.effects.length) continue;
    let fb = null;
    for (const layer of layers) {
      if (!folderChainFor(folders, layer.fid).some((x) => x.id === folder.id)) continue;
      fb = merge(fb, boundsWithExt(layer.grid, layer.ext));
    }
    if (fb) add(grow(fb, effectReach(folder.effects)));
  }
  return out;
}

export const canvasContentBounds = () => boundsFor();
