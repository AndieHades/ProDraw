import { describe, expect, it } from 'vitest';
import { effectLayerPixels } from '../../src/logic/layer-effects.js';
import { effectRegionFromMask, gridMask } from '../../src/logic/effect-surface-region.js';

const sortPixels = (pixels) => pixels.slice().sort((left, right) =>
  left[1] - right[1] || left[0] - right[0] || left[2] - right[2]);

function fixture() {
  const width = 17, height = 15;
  const grid = Array.from({ length: height }, () => new Array(width).fill(null));
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [6, 4], [8, 4],
    [6, 5], [8, 5], [6, 6], [7, 6], [8, 6], [15, 13]]) {
    grid[y][x] = [20, 30, 40, 255];
  }
  return { grid, width, height,
    bounds: { minx: 0, miny: 0, maxx: 15, maxy: 13 } };
}

describe('bounded effect surface regions', () => {
  it('matches the previous full-mask pixels for holes, islands and outside reach', () => {
    const input = fixture();
    const oldMask = input.grid.map((row) => row.map(Boolean));
    const mask = gridMask(input.grid, input.bounds);
    const effects = [
      { type: 'stroke', params: { size: 3 } },
      { type: 'glow', params: { size: 4, intensity: 0.65 } },
      { type: 'dropShadow', params: { size: 3, dx: -4, dy: 2, intensity: 0.45 } },
      { type: 'innerShadow', params: { size: 3, dx: -1, dy: 1, intensity: 0.75 } },
    ];
    for (const effect of effects) {
      const expected = effectLayerPixels(oldMask, input.width, input.height, effect);
      const region = effectRegionFromMask(mask,
        input.bounds.maxx - input.bounds.minx + 1,
        input.bounds.maxy - input.bounds.miny + 1, input.bounds, effect);
      const actual = region.pixels.map(([x, y, alpha]) => [
        x + region.bounds.minx, y + region.bounds.miny, alpha,
      ]);
      expect(sortPixels(actual)).toEqual(sortPixels(expected));
    }
  });
});
