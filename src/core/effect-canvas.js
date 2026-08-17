import { effectRegionFromGrid } from '../logic/effect-region.js';
import { INNER_EFFECTS } from '../logic/layer-effects.js';
import { alphaMask, effectRegionFromMask } from '../logic/effect-surface-region.js';
import { composeEffectSurface } from './effect-compose.js';
import { cropEffectSurface, fullCanvasSurface, isEffectSurface,
  materializeEffectSurface } from './effect-surface.js';

export const visibleAdjustments = (effects = []) => effects.filter(
  (effect) => effect.visible !== false && effect.type === 'adjustment');
export const visibleMonochromes = (effects = []) => effects.filter(
  (effect) => effect.visible !== false && effect.type === 'monochrome');
export const visibleColorEffects = (effects = []) => [
  ...visibleAdjustments(effects), ...visibleMonochromes(effects)];

const PIXEL_TYPES = new Set(['stroke', 'glow', 'dropShadow', 'innerShadow']);
export const visiblePixelEffects = (effects = []) => effects.filter(
  (effect) => effect.visible !== false && PIXEL_TYPES.has(effect.type));

const documentBounds = (width, height) => ({
  minx: 0, miny: 0, maxx: width - 1, maxy: height - 1,
});

export function buildGridEffectSurface(source, grid, bounds, effects, width, height) {
  const sourceSurface = isEffectSurface(source) ? source : cropEffectSurface(source, bounds);
  return composeEffectSurface(sourceSurface, effects, (effect) =>
    effectRegionFromGrid(grid, bounds, width, height, effect));
}

export function buildGridEffects(source, grid, bounds, effects, width, height) {
  return materializeEffectSurface(buildGridEffectSurface(
    source, grid, bounds, effects, width, height), width, height);
}

export function buildCanvasEffectSurface(value, effects, clipBounds = null) {
  const source = isEffectSurface(value) ? value : fullCanvasSurface(value);
  let mask = null;
  const regionFor = (effect) => {
    if (!mask) {
      const image = source.canvas.getContext('2d').getImageData(
        0, 0, source.canvas.width, source.canvas.height);
      mask = alphaMask(image.data, source.canvas.width, source.canvas.height);
    }
    return effectRegionFromMask(mask, source.canvas.width, source.canvas.height,
      source.bounds, effect, clipBounds);
  };
  return composeEffectSurface(source, effects, regionFor);
}

// Compatibility boundary for already-bounded transform previews. Document paths
// use buildCanvasEffectSurface directly and never materialize an A4 scratch canvas.
export function buildCanvasEffects(source, effects, width, height) {
  const surface = buildCanvasEffectSurface(fullCanvasSurface(source), effects,
    documentBounds(width, height));
  return materializeEffectSurface(surface, width, height);
}

export function folderEffectSurface(value, effects, which, clipBounds = null) {
  const source = isEffectSurface(value) ? value : fullCanvasSurface(value);
  const filtered = visiblePixelEffects(effects).filter((effect) => (
    which === 'above' ? INNER_EFFECTS.has(effect.type) :
      !INNER_EFFECTS.has(effect.type)));
  const rendered = [...filtered, ...visibleMonochromes(effects)];
  let mask = null;
  return composeEffectSurface(source, rendered, (effect) => {
    if (!mask) {
      const image = source.canvas.getContext('2d').getImageData(
        0, 0, source.canvas.width, source.canvas.height);
      mask = alphaMask(image.data, source.canvas.width, source.canvas.height);
    }
    return effectRegionFromMask(mask, source.canvas.width, source.canvas.height,
      source.bounds, effect, clipBounds);
  }, { includeSource: false });
}

// Compatibility boundary for the local Free Transform preview.
export function folderEffectCanvas(group, effects, which, width, height) {
  const surface = folderEffectSurface(fullCanvasSurface(group), effects, which,
    documentBounds(width, height));
  return materializeEffectSurface(surface, width, height);
}
