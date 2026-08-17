import { makeCanvas } from './canvas.js';

const copy = (bounds) => bounds && ({ ...bounds });

export const boundsWidth = (bounds) => bounds.maxx - bounds.minx + 1;
export const boundsHeight = (bounds) => bounds.maxy - bounds.miny + 1;

export const unionEffectBounds = (left, right) => !left ? copy(right)
  : !right ? copy(left) : ({
    minx: Math.min(left.minx, right.minx),
    miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx),
    maxy: Math.max(left.maxy, right.maxy),
  });

export function intersectEffectBounds(bounds, clip) {
  if (!bounds || !clip) return copy(bounds);
  const result = {
    minx: Math.max(bounds.minx, clip.minx),
    miny: Math.max(bounds.miny, clip.miny),
    maxx: Math.min(bounds.maxx, clip.maxx),
    maxy: Math.min(bounds.maxy, clip.maxy),
  };
  return result.maxx < result.minx || result.maxy < result.miny ? null : result;
}

export const translateEffectBounds = (bounds, dx, dy) => bounds && ({
  minx: bounds.minx + dx, miny: bounds.miny + dy,
  maxx: bounds.maxx + dx, maxy: bounds.maxy + dy,
});

export function createEffectSurface(bounds) {
  const canvas = makeCanvas(bounds ? boundsWidth(bounds) : 1,
    bounds ? boundsHeight(bounds) : 1);
  const origin = bounds ? { x: bounds.minx, y: bounds.miny } : { x: 0, y: 0 };
  return { canvas, bounds: copy(bounds), origin };
}

export const isEffectSurface = (value) => !!value?.canvas &&
  Object.prototype.hasOwnProperty.call(value, 'bounds') && !!value.origin;

export function fullCanvasSurface(canvas, originX = 0, originY = 0) {
  if (isEffectSurface(canvas)) return canvas;
  const bounds = canvas.width && canvas.height ? {
    minx: originX, miny: originY,
    maxx: originX + canvas.width - 1, maxy: originY + canvas.height - 1,
  } : null;
  return { canvas, bounds, origin: { x: originX, y: originY } };
}

export function cropEffectSurface(source, bounds) {
  if (!bounds) return createEffectSurface(null);
  const surface = createEffectSurface(bounds), context = surface.canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(source, bounds.minx, bounds.miny,
    boundsWidth(bounds), boundsHeight(bounds), 0, 0,
    boundsWidth(bounds), boundsHeight(bounds));
  return surface;
}

export function drawEffectSurface(context, value, dx = 0, dy = 0) {
  if (!value) return false;
  if (!isEffectSurface(value)) { context.drawImage(value, dx, dy); return true; }
  if (!value.bounds) return false;
  context.drawImage(value.canvas, value.origin.x + dx, value.origin.y + dy);
  return true;
}

export function materializeEffectSurface(value, width, height) {
  if (!isEffectSurface(value) && value?.width === width && value?.height === height) return value;
  const canvas = makeCanvas(width, height), context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false; drawEffectSurface(context, value); return canvas;
}
