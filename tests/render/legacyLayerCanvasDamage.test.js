/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S, blank } from '../../src/core/state.js';
import { dirtyAll, layerCanvas, markDirty } from '../../src/core/layer-cache.js';

describe('legacy layer canvas damage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clears the bounded upload region when an eraser removes pixels', () => {
    const clearRect = vi.fn(), putImageData = vi.fn();
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect, putImageData, createImageData: (width, height) =>
        ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    });
    S.W = 64; S.H = 64; S.layers = [{ name: 'Paint', grid: blank(64, 64),
      opacity: 1, visible: true, fid: null, clip: false, kind: 'pixel',
      effects: [], ext: new Map() }];
    S.layers[0].grid[27][23] = [20, 30, 40, 255];
    dirtyAll(); layerCanvas(0); clearRect.mockClear(); putImageData.mockClear();

    S.layers[0].grid[27][23] = null;
    markDirty(0, { minx: 23, miny: 27, maxx: 23, maxy: 27 });
    layerCanvas(0);

    expect(clearRect).toHaveBeenCalledWith(23, 27, 1, 1);
    expect(putImageData).toHaveBeenCalledTimes(1);
    expect(putImageData.mock.calls[0][0].data).toEqual(new Uint8ClampedArray(4));
  });

  it('renders persisted sparse grids with empty rows inside their bounds', () => {
    const putImageData = vi.fn();
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(), putImageData, createImageData: (width, height) =>
        ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    });
    const grid = new Array(5); grid[1] = new Array(5); grid[4] = new Array(5);
    grid[1][1] = [10, 20, 30, 255]; grid[4][3] = [40, 50, 60, 255];
    S.W = 5; S.H = 5; S.layers = [{ name: 'Persisted', grid, opacity: 1,
      visible: true, fid: null, clip: false, kind: 'pixel', effects: [],
      ext: new Map() }];
    dirtyAll(); expect(() => layerCanvas(0)).not.toThrow();
    expect(putImageData).toHaveBeenCalledTimes(1);
    expect(putImageData.mock.calls[0][0]).toMatchObject({ width: 3, height: 4 });
  });
});
