// Crops pixel-effect work to the visible content plus that effect's reach.
import { effectReach } from './layer-effects.js';
import { FLAT_EFFECT_PIXELS } from './effect-kernels.js';

const clippedBounds = (bounds, reach, width, height) => {
  const minx = Math.max(0, bounds.minx - reach.l);
  const miny = Math.max(0, bounds.miny - reach.t);
  const maxx = Math.min(width - 1, bounds.maxx + reach.r);
  const maxy = Math.min(height - 1, bounds.maxy + reach.b);
  return maxx < minx || maxy < miny ? null : { minx, miny, maxx, maxy };
};

export function effectRegionFromGrid(grid, contentBounds, width, height, effect) {
  const kernel = FLAT_EFFECT_PIXELS[effect.type];
  if (!kernel || !contentBounds) return null;
  const reach = effectReach([{ ...effect, visible: true }]);
  const bounds = clippedBounds(contentBounds, reach, width, height);
  if (!bounds) return null;
  const regionWidth = bounds.maxx - bounds.minx + 1;
  const regionHeight = bounds.maxy - bounds.miny + 1;
  const mask = new Uint8Array(regionWidth * regionHeight);
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    const row = grid[y];
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      if (row && row[x]) mask[(y - bounds.miny) * regionWidth + x - bounds.minx] = 1;
    }
  }
  return { bounds, width: regionWidth, height: regionHeight,
    pixels: kernel(mask, regionWidth, regionHeight, effect.params) };
}

export function documentPixels(region) {
  if (!region) return [];
  return region.pixels.map(([x, y, alpha]) => [
    x + region.bounds.minx, y + region.bounds.miny, alpha,
  ]);
}
