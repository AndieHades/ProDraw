import { S } from './state.ts';
import { boundsWithExt } from '../logic/raster.ts';
import { effectReach } from '../logic/layer-effects.ts';
import { meaningfulLayerBounds } from '../logic/raster/meaningfulBounds.ts';
import { CONTENT_FIT } from '../config/content-fit.ts';

const grow = (b, r) => ({ minx: b.minx - r.l, miny: b.miny - r.t, maxx: b.maxx + r.r, maxy: b.maxy + r.b });
const merge = (a, b) => (a ? { minx: Math.min(a.minx, b.minx), miny: Math.min(a.miny, b.miny), maxx: Math.max(a.maxx, b.maxx), maxy: Math.max(a.maxy, b.maxy) } : b);
// keep — рамка значимых пикселей: то, что за ней (остатки стирания), не считается
const clip = (b, keep) => {
  if (!b || !keep) return b;
  const out = { minx: Math.max(b.minx, keep.minx), miny: Math.max(b.miny, keep.miny),
    maxx: Math.min(b.maxx, keep.maxx), maxy: Math.min(b.maxy, keep.maxy) };
  return out.minx > out.maxx || out.miny > out.maxy ? null : out;
};

function folderChainFor(folders, fid) {
  const out = []; let id = fid;
  while (id != null) { const f = folders.find((x) => x.id === id); if (!f) break; out.push(f); id = f.parent ?? null; }
  return out;
}

export function boundsFor(layers = S.layers, folders = S.folders, keep = null) {
  let out = null;
  const add = (b) => { if (b) out = merge(out, b); };
  const pixels = (layer) => clip(boundsWithExt(layer.grid, layer.ext), keep);
  for (const layer of layers) {
    let b = pixels(layer);
    if (!b) continue;
    if (layer.effects && layer.effects.length) b = grow(b, effectReach(layer.effects));
    add(b);
  }
  for (const folder of folders) {
    if (!folder.effects || !folder.effects.length) continue;
    let fb = null;
    for (const layer of layers) {
      if (!folderChainFor(folders, layer.fid).some((x) => x.id === folder.id)) continue;
      const b = pixels(layer); if (b) fb = merge(fb, b);
    }
    if (fb) add(grow(fb, effectReach(folder.effects)));
  }
  return out;
}

export const canvasContentBounds = () => boundsFor();

// охват для авто-рамки: как boundsFor, но без крошечных полупрозрачных остатков
// вокруг рисунка (эффекты слоёв по-прежнему расширяют рамку)
export const contentFitBoundsFor = (layers = S.layers, folders = S.folders) =>
  boundsFor(layers, folders, meaningfulLayerBounds(layers, CONTENT_FIT));
