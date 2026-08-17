// Bounded Free Transform preview. Every scratch canvas is cropped to visible
// transformed content plus the largest active layer/folder effect halo.
import { S } from '../../core/state.js';
import { makeCanvas, paintCanvas } from '../../core/canvas.js';
import { folderEffectCanvas } from '../../core/effect-canvas.js';
import { folderEffectsFor, fxOnCanvas, layerRenderEffects } from '../../core/effects-render.js';
import { clipBase, effVis, folderChain } from '../../core/layers.js';
import { effectReach } from '../../logic/layer-effects.js';
import { canvasBounds, unionBounds } from './raster-state.js';

const expand = (bounds, effects) => { const reach = effectReach(effects || []); return {
  minx: bounds.minx - reach.l, miny: bounds.miny - reach.t,
  maxx: bounds.maxx + reach.r, maxy: bounds.maxy + reach.b,
}; };

function localBounds(entries, width, height) {
  let bounds = null;
  for (const entry of entries) {
    const raw = canvasBounds(entry.result, width, height); entry.contentBounds = raw;
    if (!raw) continue;
    bounds = unionBounds(bounds, expand(raw, layerRenderEffects(entry.idx)));
    for (const folder of folderChain(entry.L.fid))
      bounds = unionBounds(bounds, expand(raw, folderEffectsFor(folder)));
  }
  return canvasBounds(bounds, width, height);
}

function contentCanvas(entry, bounds) {
  const width = bounds.maxx - bounds.minx + 1, height = bounds.maxy - bounds.miny + 1;
  return paintCanvas(width, height, (data) => {
    for (const [x, y, cell] of entry.result.cells) {
      if (x < bounds.minx || y < bounds.miny || x > bounds.maxx || y > bounds.maxy) continue;
      const offset = ((y - bounds.miny) * width + x - bounds.minx) * 4;
      data[offset] = cell[0]; data[offset + 1] = cell[1]; data[offset + 2] = cell[2];
      data[offset + 3] = cell.length > 3 ? cell[3] : 255;
    }
  });
}

function putMask(data, bounds, width, x, y, cell) {
  if (!cell || x < bounds.minx || y < bounds.miny || x > bounds.maxx || y > bounds.maxy) return;
  data[((y - bounds.miny) * width + x - bounds.minx) * 4 + 3] = cell[3] ?? 255;
}

function staticClipMask(index, bounds) {
  const width = bounds.maxx - bounds.minx + 1, height = bounds.maxy - bounds.miny + 1;
  const layer = S.layers[index], floating = S.selFloat;
  return paintCanvas(width, height, (data) => {
    for (let y = bounds.miny; y <= bounds.maxy; y++) for (let x = bounds.minx; x <= bounds.maxx; x++)
      putMask(data, bounds, width, x, y, layer.grid[y]?.[x]);
    if (!floating || (floating.li ?? S.cur) !== index) return;
    if (floating.symItems) for (const item of floating.symItems)
      putMask(data, bounds, width, item.ax + item.sgnx * floating.dx,
        item.ay + item.sgny * floating.dy, item.c);
    else for (const [key, cell] of floating.cells) { const comma = key.indexOf(',');
      putMask(data, bounds, width, floating.x + +key.slice(0, comma),
        floating.y + +key.slice(comma + 1), cell); }
  });
}

function clipCanvas(entry, byIndex, source, bounds) {
  if (!entry.L.clip) return source;
  const base = clipBase(entry.idx); if (base < 0 || !effVis(base)) return null;
  const mask = byIndex.get(base)?.content || staticClipMask(base, bounds);
  const output = makeCanvas(source.width, source.height), context = output.getContext('2d');
  context.imageSmoothingEnabled = false; context.drawImage(source, 0, 0);
  context.globalCompositeOperation = 'destination-in'; context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = 'source-over'; return output;
}

export function buildTransformPreview(results, width, height) {
  const entries = results.filter(({ s, r }) => r && S.layers.includes(s.L) &&
    effVis(s.idx) && s.L.opacity > 0).map(({ s, r }) => ({ ...s, result: r }));
  const idx = entries.reduce((highest, entry) => Math.max(highest, entry.idx), -1);
  if (!entries.length) return { idx, canvas: null };
  const bounds = localBounds(entries, width, height); if (!bounds) return { idx, canvas: null };
  const localWidth = bounds.maxx - bounds.minx + 1, localHeight = bounds.maxy - bounds.miny + 1;
  for (const entry of entries) entry.content = contentCanvas(entry, bounds);
  const output = makeCanvas(localWidth, localHeight), context = output.getContext('2d');
  context.imageSmoothingEnabled = false;
  const inFolder = (layer, id) => folderChain(layer.fid).some((folder) => folder.id === id);
  const byIndex = new Map(entries.map((entry) => [entry.idx, entry]));
  const folders = S.folders.filter((folder) => folderEffectsFor(folder).length &&
    entries.some((entry) => inFolder(entry.L, folder.id)));
  const group = (folder) => { const canvas = makeCanvas(localWidth, localHeight), x = canvas.getContext('2d');
    for (const entry of entries) if (inFolder(entry.L, folder.id) && !entry.L.clip)
      x.drawImage(entry.content, 0, 0); return canvas; };
  const depth = (a, b) => folderChain(a.id).length - folderChain(b.id).length;
  for (const folder of folders.slice().sort(depth)) context.drawImage(folderEffectCanvas(
    group(folder), folderEffectsFor(folder), 'below', localWidth, localHeight), 0, 0);
  for (const entry of entries) { const canvas = clipCanvas(entry, byIndex,
    fxOnCanvas(entry.content, layerRenderEffects(entry.idx), localWidth, localHeight), bounds);
    if (canvas) context.drawImage(canvas, 0, 0); }
  for (const folder of folders.slice().sort((a, b) => depth(b, a))) context.drawImage(folderEffectCanvas(
    group(folder), folderEffectsFor(folder), 'above', localWidth, localHeight), 0, 0);
  return { idx, canvas: output, px: bounds.minx, py: bounds.miny,
    ow: localWidth, oh: localHeight };
}
