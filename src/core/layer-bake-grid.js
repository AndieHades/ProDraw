import { adjustColor } from '../logic/adjustment.ts';
import { hexToRgb } from '../logic/color.ts';
import { effectRegionFromGrid } from '../logic/effect-region.js';
import { EFFECT_PIXELS, INNER_EFFECTS } from '../logic/layer-effects.js';
import { monochromeColor } from '../logic/monochrome.js';
import { blank, gridBounds, mergeCells } from '../logic/raster.js';

const alpha = (cell) => cell ? (cell[3] ?? 255) : 0;
const visibleAdjustments = (effects) => effects.filter((effect) =>
  effect.visible !== false && effect.type === 'adjustment');
const hasMonochrome = (effects) => effects.some((effect) =>
  effect.visible !== false && effect.type === 'monochrome');
const visiblePixelEffects = (effects) => effects.filter((effect) =>
  effect.visible !== false && EFFECT_PIXELS[effect.type]);

function put(grid, x, y, color, opacity, width, height) {
  if (x < 0 || y < 0 || x >= width || y >= height ||
    !color || !alpha(color) || opacity <= 0) return;
  grid[y][x] = mergeCells(grid[y][x], color, opacity);
}

export function drawBoundedGrid(target, source, opacity, width, height) {
  const bounds = gridBounds(source); if (!bounds || opacity <= 0) return target;
  const minx = Math.max(0, bounds.minx), miny = Math.max(0, bounds.miny);
  const maxx = Math.min(width - 1, bounds.maxx), maxy = Math.min(height - 1, bounds.maxy);
  for (let y = miny; y <= maxy; y++) { const row = source[y];
    for (let x = minx; x <= maxx; x++)
      put(target, x, y, row?.[x], opacity, width, height); }
  return target;
}

function blendAdjustment(before, after, opacity) {
  if (opacity >= 1) return after;
  return before.map((value, channel) => Math.round(value +
    ((after[channel] ?? value) - value) * opacity));
}

function adjustedGrid(source, effects, width, height) {
  const adjustments = visibleAdjustments(effects);
  if (!adjustments.length) return source;
  const output = blank(width, height), bounds = gridBounds(source);
  if (!bounds) return output;
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    const row = source[y];
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      let color = row?.[x]; if (!color) continue; color = color.slice();
      for (const effect of adjustments) color = blendAdjustment(color,
        adjustColor(color, effect.params), effect.opacity ?? 1);
      output[y][x] = color;
    }
  }
  return output;
}

export function applyMonochromeEffects(grid, effects) {
  if (!hasMonochrome(effects || [])) return grid;
  const bounds = gridBounds(grid); if (!bounds) return grid;
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    const row = grid[y];
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      if (row?.[x]) row[x] = monochromeColor(row[x]);
    }
  }
  return grid;
}

function drawPixelEffect(target, source, effect, width, height, innerSource) {
  const bounds = gridBounds(source);
  const region = effectRegionFromGrid(source, bounds, width, height, effect);
  if (!region) return;
  const rgb = hexToRgb(effect.params.color);
  for (const [localX, localY, effectAlpha] of region.pixels) {
    const x = region.bounds.minx + localX, y = region.bounds.miny + localY;
    const maskAlpha = innerSource ? alpha(innerSource[y]?.[x]) : 255;
    const value = Math.round(effectAlpha * maskAlpha / 255);
    put(target, x, y, [rgb[0], rgb[1], rgb[2], value],
      effect.opacity ?? 1, width, height);
  }
}

export function bakeGrid(source, ownEffects, inheritedColorEffects, width, height) {
  const output = blank(width, height), effects = ownEffects || [];
  for (const effect of visiblePixelEffects(effects)) {
    if (!INNER_EFFECTS.has(effect.type))
      drawPixelEffect(output, source, effect, width, height, null);
  }
  const adjusted = adjustedGrid(source,
    [...(inheritedColorEffects || []), ...effects], width, height);
  drawBoundedGrid(output, adjusted, 1, width, height);
  for (const effect of visiblePixelEffects(effects)) {
    if (INNER_EFFECTS.has(effect.type))
      drawPixelEffect(output, source, effect, width, height, adjusted);
  }
  return applyMonochromeEffects(output,
    [...(inheritedColorEffects || []), ...effects]);
}

export function clipGridToAlpha(source, mask, width, height) {
  const output = blank(width, height), left = gridBounds(source);
  const right = gridBounds(mask); if (!left || !right) return output;
  const bounds = { minx: Math.max(left.minx, right.minx),
    miny: Math.max(left.miny, right.miny), maxx: Math.min(left.maxx, right.maxx),
    maxy: Math.min(left.maxy, right.maxy) };
  if (bounds.maxx < bounds.minx || bounds.maxy < bounds.miny) return output;
  for (let y = bounds.miny; y <= bounds.maxy; y++) {
    const sourceRow = source[y], maskRow = mask[y];
    for (let x = bounds.minx; x <= bounds.maxx; x++) {
      const color = sourceRow?.[x], maskAlpha = alpha(maskRow?.[x]);
      if (!color || !maskAlpha) continue;
      const value = Math.round(alpha(color) * maskAlpha / 255);
      output[y][x] = [color[0], color[1], color[2], value];
    }
  }
  return output;
}

export function drawEffectGrid(target, source, effect, width, height, innerSource = null) {
  drawPixelEffect(target, source, effect, width, height, innerSource);
}

export const pixelEffects = visiblePixelEffects;
