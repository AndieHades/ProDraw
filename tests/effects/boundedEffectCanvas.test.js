/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildGridEffects } from '../../src/core/effect-canvas.js';
import { dirtyAll, layerCanvas } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';

const allocations = [];
const contexts = new WeakMap();
function contextFor(canvas) {
  if (contexts.has(canvas)) return contexts.get(canvas);
  const context = {
    canvas, globalAlpha: 1, globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false, drawImage: vi.fn(), putImageData: vi.fn(), clearRect: vi.fn(),
    createImageData: (width, height) => {
      allocations.push({ kind: 'create', width, height });
      return { data: new Uint8ClampedArray(width * height * 4), width, height };
    },
    getImageData: (_x, _y, width, height) => {
      allocations.push({ kind: 'read', width, height });
      return { data: new Uint8ClampedArray(width * height * 4), width, height };
    },
  };
  contexts.set(canvas, context); return context;
}

describe('bounded effect canvas allocations', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps masks and ImageData local on a sparse A4 layer', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return contextFor(this);
    });
    allocations.length = 0;
    const width = 2480, height = 3508;
    const grid = Array.from({ length: height }, () => []);
    for (let y = 1700; y < 1712; y++) for (let x = 1200; x < 1212; x++) {
      grid[y][x] = [80, 90, 100, 255];
    }
    const source = globalThis.document.createElement('canvas'); source.width = width; source.height = height;
    const effects = [
      { type: 'stroke', params: { size: 6, color: '#ffffff' } },
      { type: 'glow', params: { size: 8, intensity: 0.6, color: '#ffffff' } },
      { type: 'dropShadow', params: { size: 5, dx: 7, dy: -4, intensity: 0.5, color: '#000000' } },
      { type: 'innerShadow', params: { size: 4, dx: 1, dy: 1, intensity: 0.5, color: '#000000' } },
      { type: 'adjustment', params: { brightness: 10 } },
    ];
    const output = buildGridEffects(source, grid,
      { minx: 1200, miny: 1700, maxx: 1211, maxy: 1711 }, effects, width, height);
    expect([output.width, output.height]).toEqual([width, height]);
    expect(allocations.length).toBeGreaterThan(0);
    expect(Math.max(...allocations.map((item) => item.width))).toBeLessThanOrEqual(29);
    expect(Math.max(...allocations.map((item) => item.height))).toBeLessThanOrEqual(28);
    expect(allocations.some((item) => item.width === width || item.height === height)).toBe(false);
  });

  it('does not allocate ImageData for a newly-created blank A4 layer', () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return contextFor(this);
    });
    allocations.length = 0; S.W = 2480; S.H = 3508;
    S.layers = [newLayer('Blank', S.W, S.H)];
    dirtyAll({ preserveGridBounds: true });
    Object.defineProperty(S.layers[0].grid[0], 0, {
      configurable: true, get: () => { throw new Error('blank grid was scanned'); },
    });
    const canvas = layerCanvas(0);
    expect([canvas.width, canvas.height]).toEqual([S.W, S.H]);
    expect(allocations).toEqual([]);
  });
});
