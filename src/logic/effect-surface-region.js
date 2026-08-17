import { FLAT_EFFECT_PIXELS } from './effect-kernels.js';
import { effectReach } from './layer-effects.js';

const grow = (bounds, reach) => ({
  minx: bounds.minx - reach.l, miny: bounds.miny - reach.t,
  maxx: bounds.maxx + reach.r, maxy: bounds.maxy + reach.b,
});

const intersect = (bounds, clip) => {
  if (!clip) return bounds;
  const result = {
    minx: Math.max(bounds.minx, clip.minx),
    miny: Math.max(bounds.miny, clip.miny),
    maxx: Math.min(bounds.maxx, clip.maxx),
    maxy: Math.min(bounds.maxy, clip.maxy),
  };
  return result.maxx < result.minx || result.maxy < result.miny ? null : result;
};

export function alphaMask(data, width, height) {
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < mask.length; index++) {
    if (data[index * 4 + 3] > 8) mask[index] = 1;
  }
  return mask;
}

export function gridMask(grid, bounds) {
  const width = bounds.maxx - bounds.minx + 1;
  const height = bounds.maxy - bounds.miny + 1;
  const mask = new Uint8Array(width * height);
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    const row = grid[y];
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      if (row?.[x]) mask[(y - bounds.miny) * width + x - bounds.minx] = 1;
    }
  }
  return mask;
}

export function effectRegionFromMask(mask, sourceWidth, sourceHeight,
  sourceBounds, effect, clipBounds = null) {
  const kernel = FLAT_EFFECT_PIXELS[effect.type];
  if (!kernel || !sourceBounds) return null;
  const reach = effectReach([{ ...effect, visible: true }]);
  const bounds = intersect(grow(sourceBounds, reach), clipBounds);
  if (!bounds) return null;
  const width = bounds.maxx - bounds.minx + 1;
  const height = bounds.maxy - bounds.miny + 1;
  const expanded = new Uint8Array(width * height);
  for (let sy = 0; sy < sourceHeight; sy++) for (let sx = 0; sx < sourceWidth; sx++) {
    if (!mask[sy * sourceWidth + sx]) continue;
    const x = sourceBounds.minx + sx, y = sourceBounds.miny + sy;
    if (x < bounds.minx || y < bounds.miny || x > bounds.maxx || y > bounds.maxy) continue;
    expanded[(y - bounds.miny) * width + x - bounds.minx] = 1;
  }
  return { bounds, width, height, pixels: kernel(expanded, width, height, effect.params) };
}
