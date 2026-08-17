import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { documentPixels, effectRegionFromGrid } from '../../src/logic/effect-region.js';

const normalizedHash = (pixels) => createHash('sha256').update(JSON.stringify(
  pixels.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]),
)).digest('hex');

function fixture() {
  const width = 25, height = 20;
  const grid = Array.from({ length: height }, () => Array(width).fill(null));
  for (const [x, y] of [[10, 8], [11, 8], [12, 8], [10, 9],
    [12, 9], [10, 10], [11, 10], [12, 10]]) grid[y][x] = [1, 1, 1, 255];
  return { width, height, grid, bounds: { minx: 10, miny: 8, maxx: 12, maxy: 10 } };
}

describe('bounded legacy effect regions', () => {
  it('matches the frozen full-canvas pixel output for every effect', () => {
    const input = fixture();
    const cases = [
      [{ type: 'stroke', params: { size: 3 } }, 73,
        'c4a48cfca59f6ac27e243cb8528b7aebe933c82b1192fd3a9d403b3d7d945914'],
      [{ type: 'glow', params: { size: 4, intensity: 0.65 } }, 69,
        'a27002554cd266ff7c3940dac9510f9bafcf3e2400b6d1a9ce72ef48884905b0'],
      [{ type: 'dropShadow', params: { size: 3, dx: -4, dy: 2, intensity: 0.45 } }, 49,
        'd5228fa6e9a2f309c834f55e21d3e3a4009288275e2547572f69ed0359706296'],
      [{ type: 'innerShadow', params: { size: 3, dx: -1, dy: 1, intensity: 0.75 } }, 8,
        'c40c7ebaef3e3a82552ada8e7c47970da878abeb59a98826ea12640208632224'],
    ];
    for (const [effect, count, hash] of cases) {
      const region = effectRegionFromGrid(input.grid, input.bounds,
        input.width, input.height, effect);
      const pixels = documentPixels(region);
      expect(pixels).toHaveLength(count);
      expect(normalizedHash(pixels)).toBe(hash);
    }
  });

  it('clips effect reach at document edges without changing pixels', () => {
    const width = 11, height = 9;
    const grid = Array.from({ length: height }, () => Array(width).fill(null));
    for (const [x, y] of [[0, 0], [1, 0], [4, 2], [5, 2], [4, 3],
      [7, 7], [10, 8]]) grid[y][x] = [1, 1, 1, 255];
    const effect = { type: 'dropShadow', params: { size: 2, dx: 2, dy: -1, intensity: 0.6 } };
    const region = effectRegionFromGrid(grid, { minx: 0, miny: 0, maxx: 10, maxy: 8 },
      width, height, effect);
    expect(normalizedHash(documentPixels(region))).toBe(
      'b32764d80db0a2941b149c99a4c5fdf14a5501e71a798113ee3e50b72d49cbff');
  });
});
