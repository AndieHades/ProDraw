import { parseKey } from '../logic/raster.js';
import { makeCanvas } from './canvas.js';
import { intersectEffectBounds, translateEffectBounds,
  unionEffectBounds } from './effect-surface.js';
import { layerCanvas, layerContentBounds, layerExtCanvas } from './layer-cache.js';
import { applyPsdMasks } from './psd-mask.ts';
import { S } from './state.js';

const documentBounds = () => ({ minx: 0, miny: 0, maxx: S.W - 1, maxy: S.H - 1 });

function floatCells(index) {
  const floating = S.selFloat;
  if (!floating || (floating.li ?? S.cur) !== index) return [];
  if (floating.symItems) return floating.symItems.map((item) => [
    item.ax + item.sgnx * floating.dx,
    item.ay + item.sgny * floating.dy, item.c,
  ]);
  return [...floating.cells].map(([key, color]) => {
    const [x, y] = parseKey(key); return [floating.x + x, floating.y + y, color];
  });
}

function cellsBounds(cells) {
  let bounds = null;
  for (const [x, y] of cells) bounds = unionEffectBounds(bounds,
    { minx: x, miny: y, maxx: x, maxy: y });
  return bounds;
}

function extBounds(ext) {
  let bounds = null;
  for (const key of ext?.keys() || []) {
    const [x, y] = parseKey(key);
    bounds = unionEffectBounds(bounds, { minx: x, miny: y, maxx: x, maxy: y });
  }
  return bounds;
}

export function layerEffectSource(index, dx = 0, dy = 0, includeExt = false) {
  const layer = S.layers[index], cells = floatCells(index);
  let sourceBounds = unionEffectBounds(layerContentBounds(index), cellsBounds(cells));
  if (includeExt) sourceBounds = unionEffectBounds(sourceBounds, extBounds(layer.ext));
  const bounds = intersectEffectBounds(translateEffectBounds(sourceBounds, dx, dy),
    documentBounds());
  const canvas = makeCanvas(bounds ? bounds.maxx - bounds.minx + 1 : 1,
    bounds ? bounds.maxy - bounds.miny + 1 : 1);
  const origin = bounds ? { x: bounds.minx, y: bounds.miny } : { x: 0, y: 0 };
  const surface = { canvas, bounds, origin }; if (!bounds) return surface;
  const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
  context.drawImage(layerCanvas(index), dx - origin.x, dy - origin.y);
  if (includeExt) {
    const ext = layerExtCanvas(index);
    if (ext) context.drawImage(ext.canvas,
      ext.ox + dx - origin.x, ext.oy + dy - origin.y);
  }
  for (const [x, y, color] of cells) {
    const px = x + dx, py = y + dy;
    if (px < bounds.minx || py < bounds.miny || px > bounds.maxx || py > bounds.maxy) continue;
    context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(color[3] ?? 255) / 255})`;
    context.fillRect(px - origin.x, py - origin.y, 1, 1);
  }
  return applyPsdMasks(surface, layer, dx, dy);
}
