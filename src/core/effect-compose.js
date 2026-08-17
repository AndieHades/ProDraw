import { adjustColor } from '../logic/adjustment.js';
import { hexToRgb } from '../logic/color.js';
import { INNER_EFFECTS } from '../logic/layer-effects.js';
import { makeCanvas, paintCanvas } from './canvas.js';
import { createEffectSurface, unionEffectBounds } from './effect-surface.js';

function adjustedCanvas(source, effects) {
  const adjustments = effects.filter((effect) => effect.visible !== false &&
    effect.type === 'adjustment');
  if (!adjustments.length) return source.canvas;
  const canvas = makeCanvas(source.canvas.width, source.canvas.height);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false; context.drawImage(source.canvas, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] <= 0) continue;
    let color = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
    for (const effect of adjustments) {
      const opacity = effect.opacity ?? 1, after = adjustColor(color, effect.params);
      color = opacity >= 1 ? after : color.map((value, channel) => Math.round(
        value + ((after[channel] ?? value) - value) * opacity));
    }
    data[offset] = color[0]; data[offset + 1] = color[1];
    data[offset + 2] = color[2]; data[offset + 3] = color[3] ?? data[offset + 3];
  }
  context.putImageData(image, 0, 0); return canvas;
}

function regionCanvas(region, effect, source, inner) {
  const color = hexToRgb(effect.params.color);
  const canvas = paintCanvas(region.width, region.height, (data) => {
    for (const [x, y, alpha] of region.pixels) {
      const offset = (y * region.width + x) * 4;
      data[offset] = color[0]; data[offset + 1] = color[1];
      data[offset + 2] = color[2]; data[offset + 3] = alpha;
    }
  });
  if (!inner) return canvas;
  const context = canvas.getContext('2d');
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(source.canvas, source.origin.x - region.bounds.minx,
    source.origin.y - region.bounds.miny);
  context.globalCompositeOperation = 'source-over'; return canvas;
}

function drawRegion(context, output, source, entry) {
  const inner = INNER_EFFECTS.has(entry.effect.type);
  const canvas = regionCanvas(entry.region, entry.effect, source, inner);
  context.globalAlpha = entry.effect.opacity ?? 1;
  context.drawImage(canvas, entry.region.bounds.minx - output.origin.x,
    entry.region.bounds.miny - output.origin.y);
}

export function composeEffectSurface(source, effects, regionFor,
  { includeSource = true } = {}) {
  if (!source?.bounds) return createEffectSurface(null);
  const pixelEntries = [];
  let bounds = includeSource ? source.bounds : null;
  for (const effect of effects) {
    if (effect.visible === false || effect.type === 'adjustment') continue;
    const region = regionFor(effect); if (!region) continue;
    pixelEntries.push({ effect, region });
    bounds = unionEffectBounds(bounds, region.bounds);
  }
  const output = createEffectSurface(bounds); if (!bounds) return output;
  const context = output.canvas.getContext('2d'); context.imageSmoothingEnabled = false;
  for (const entry of pixelEntries) {
    if (!INNER_EFFECTS.has(entry.effect.type)) drawRegion(context, output, source, entry);
  }
  if (includeSource) {
    context.globalAlpha = 1; context.drawImage(adjustedCanvas(source, effects),
      source.origin.x - output.origin.x, source.origin.y - output.origin.y);
  }
  for (const entry of pixelEntries) {
    if (INNER_EFFECTS.has(entry.effect.type)) drawRegion(context, output, source, entry);
  }
  context.globalAlpha = 1; return output;
}
