/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S, blank, newLayer } from '../../src/core/state.js';
import { dirtyAll, layerCanvas, markDirty } from '../../src/core/layer-cache.js';
import { rasterOwnerForLayer } from '../../src/core/raster/legacyRasterOwner.ts';

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

  it('renders committed paint from the live surface without rereading its grid cell', () => {
    const putImageData = vi.fn();
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(), putImageData, createImageData: (width, height) =>
        ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    });
    S.W = 8; S.H = 8; const layer = newLayer('Surface', 8, 8); S.layers = [layer];
    const owner = rasterOwnerForLayer(layer); owner.beginRasterEdit('Paint', 8, 8);
    owner.setCell(3, 2, [70, 80, 90, 255]);
    markDirty(0, { minx: 3, miny: 2, maxx: 3, maxy: 2 }); owner.commitRasterEdit();
    Object.defineProperty(layer.grid[2], '3', { configurable: true,
      get: () => { throw new Error('compositor reread the compatibility cell'); } });

    expect(() => layerCanvas(0)).not.toThrow();
    expect([...putImageData.mock.calls.at(-1)[0].data]).toEqual([70, 80, 90, 255]);
  });
});
