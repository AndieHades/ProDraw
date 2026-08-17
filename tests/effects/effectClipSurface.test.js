/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clipEffectSurface } from '../../src/core/effect-clip-surface.js';
import { createEffectSurface,
  materializeEffectSurface } from '../../src/core/effect-surface.js';

const buffers = new WeakMap(), contexts = new WeakMap();
function pixels(canvas) {
  const size = canvas.width * canvas.height * 4;
  if (buffers.get(canvas)?.length !== size) buffers.set(canvas, new Uint8ClampedArray(size));
  return buffers.get(canvas);
}
function setPixel(canvas, x, y, color) {
  const offset = (y * canvas.width + x) * 4, data = pixels(canvas);
  for (let channel = 0; channel < 4; channel++) data[offset + channel] = color[channel];
}
function sourceOver(destination, offset, source, sourceOffset) {
  const alpha = source[sourceOffset + 3] / 255; if (!alpha) return;
  const oldAlpha = destination[offset + 3] / 255;
  const outAlpha = alpha + oldAlpha * (1 - alpha);
  for (let channel = 0; channel < 3; channel++) destination[offset + channel] = Math.round(
    (source[sourceOffset + channel] * alpha +
      destination[offset + channel] * oldAlpha * (1 - alpha)) / outAlpha);
  destination[offset + 3] = Math.round(outAlpha * 255);
}
function drawImage(context, image, dx = 0, dy = 0) {
  const destination = pixels(context.canvas), source = pixels(image);
  if (context.globalCompositeOperation === 'destination-in') {
    for (let y = 0; y < context.canvas.height; y++) for (let x = 0; x < context.canvas.width; x++) {
      const sx = x - dx, sy = y - dy, offset = (y * context.canvas.width + x) * 4;
      const alpha = sx >= 0 && sy >= 0 && sx < image.width && sy < image.height
        ? source[(sy * image.width + sx) * 4 + 3] : 0;
      destination[offset + 3] = Math.round(destination[offset + 3] * alpha / 255);
      if (!destination[offset + 3]) destination.fill(0, offset, offset + 4);
    }
    return;
  }
  for (let sy = 0; sy < image.height; sy++) for (let sx = 0; sx < image.width; sx++) {
    const x = sx + dx, y = sy + dy;
    if (x < 0 || y < 0 || x >= context.canvas.width || y >= context.canvas.height) continue;
    sourceOver(destination, (y * context.canvas.width + x) * 4,
      source, (sy * image.width + sx) * 4);
  }
}
function contextFor(canvas) {
  if (!contexts.has(canvas)) contexts.set(canvas, {
    canvas, globalCompositeOperation: 'source-over', imageSmoothingEnabled: false,
    drawImage(image, dx, dy) { drawImage(this, image, dx, dy); },
  });
  return contexts.get(canvas);
}

describe('bounded clipped effect surface', () => {
  afterEach(() => vi.restoreAllMocks());

  it('matches the former full-document mask for holes, islands and shifted ext', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function () { return contextFor(this); });
    const source = createEffectSurface({ minx: 1, miny: 1, maxx: 5, maxy: 4 });
    for (const [x, y] of [[0, 0], [1, 1], [2, 1], [3, 2], [4, 3]]) {
      setPixel(source.canvas, x, y, [180, 30, 20, 255]);
    }
    const mask = createEffectSurface({ minx: 2, miny: 0, maxx: 6, maxy: 5 });
    setPixel(mask.canvas, 2, 0, [0, 0, 0, 255]);
    setPixel(mask.canvas, 4, 1, [0, 0, 0, 128]);
    setPixel(mask.canvas, 1, 1, [0, 0, 0, 255]);
    const extraCanvas = globalThis.document.createElement('canvas');
    extraCanvas.width = 2; extraCanvas.height = 2;
    setPixel(extraCanvas, 1, 0, [20, 160, 40, 255]);
    const extra = { canvas: extraCanvas, ox: 0, oy: 2 };
    const documentBounds = { minx: 0, miny: 0, maxx: 8, maxy: 7 };
    const actualSurface = clipEffectSurface({ source, sourceDx: 1, sourceDy: -1,
      extra, mask, maskDx: -1, maskDy: 1, documentBounds });
    expect(actualSurface.bounds).toEqual({ minx: 1, miny: 1, maxx: 5, maxy: 3 });
    const actual = materializeEffectSurface(actualSurface, 9, 8);

    const legacy = globalThis.document.createElement('canvas');
    legacy.width = 9; legacy.height = 8; const legacyContext = contextFor(legacy);
    legacyContext.drawImage(materializeEffectSurface(source, 9, 8), 1, -1);
    legacyContext.drawImage(extraCanvas, 1, 1);
    legacyContext.globalCompositeOperation = 'destination-in';
    legacyContext.drawImage(materializeEffectSurface(mask, 9, 8), -1, 1);
    expect([...pixels(actual)]).toEqual([...pixels(legacy)]);
  });
});
