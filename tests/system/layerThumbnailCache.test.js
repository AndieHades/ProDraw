/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newLayer, S } from '../../src/core/state.js';
import { dirtyAll, markDirty } from '../../src/core/layer-cache.js';
import { rasterOwnerForLayer } from '../../src/core/raster/legacyRasterOwner.ts';
import { layerThumbnail } from '../../src/systems/layers/thumbnail.js';

describe('layer thumbnail cache', () => {
  beforeEach(() => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect() {}, fillRect() {}, drawImage() {}, putImageData() {},
      createImageData: (width, height) =>
        ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
      set imageSmoothingEnabled(_value) {}, set fillStyle(_value) {}
    });
    S.W = 32; S.H = 32; S.cur = 0;
    S.layers = [newLayer('A', 32, 32), newLayer('B', 32, 32)];
    dirtyAll();
  });

  afterEach(() => vi.restoreAllMocks());

  it('reuses the drawing until the layer changes', () => {
    const first = layerThumbnail(0);
    expect(layerThumbnail(0)).toBe(first);
    rasterOwnerForLayer(S.layers[0]).setCell(4, 4, [1, 2, 3, 255]);
    markDirty(0, { minx: 4, miny: 4, maxx: 4, maxy: 4 });
    expect(layerThumbnail(0)).not.toBe(first);
  });

  it('keeps one drawing per layer', () => {
    const a = layerThumbnail(0), b = layerThumbnail(1);
    expect(a).not.toBe(b);
    expect(layerThumbnail(0)).toBe(a);
    expect(layerThumbnail(1)).toBe(b);
  });

  it('redraws everything after a full invalidation', () => {
    const first = layerThumbnail(0);
    dirtyAll();
    expect(layerThumbnail(0)).not.toBe(first);
  });
});
