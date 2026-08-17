import { createEffectSurface, drawEffectSurface, fullCanvasSurface,
  intersectEffectBounds, translateEffectBounds,
  unionEffectBounds } from './effect-surface.js';

const shiftedBounds = (surface, dx, dy) =>
  translateEffectBounds(surface?.bounds, dx, dy);

export function clipEffectSurface({ source, sourceDx = 0, sourceDy = 0,
  extra = null, mask, maskDx = 0, maskDy = 0, documentBounds }) {
  const extraSurface = extra?.canvas
    ? fullCanvasSurface(extra.canvas, extra.ox + sourceDx, extra.oy + sourceDy)
    : null;
  const sourceBounds = unionEffectBounds(
    shiftedBounds(source, sourceDx, sourceDy), extraSurface?.bounds);
  const maskBounds = shiftedBounds(mask, maskDx, maskDy);
  const clippedSource = intersectEffectBounds(sourceBounds, documentBounds);
  const bounds = maskBounds
    ? intersectEffectBounds(clippedSource, maskBounds) : null;
  const output = createEffectSurface(bounds); if (!bounds) return output;
  const context = output.canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  drawEffectSurface(context, source,
    sourceDx - output.origin.x, sourceDy - output.origin.y);
  if (extraSurface) drawEffectSurface(context, extraSurface,
    -output.origin.x, -output.origin.y);
  context.globalCompositeOperation = 'destination-in';
  drawEffectSurface(context, mask,
    maskDx - output.origin.x, maskDy - output.origin.y);
  return output;
}
