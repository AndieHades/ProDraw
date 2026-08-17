import { describe, expect, it } from 'vitest';
import { floodRegion, visitFloodRegion } from '../../src/logic/flood.js';

describe('scanline flood visitor', () => {
  it('matches the legacy region while allowing in-place paint', () => {
    const grid = Array.from({ length: 6 }, () => Array(7).fill(null));
    for (let y = 1; y < 5; y++) for (let x = 1; x < 6; x++) grid[y][x] = [1, 2, 3];
    grid[3][3] = [9, 9, 9];
    const expected = floodRegion(grid, 2, 2).map(([x, y]) => y * 7 + x).sort((a, b) => a - b);
    const actual = [];
    visitFloodRegion(grid, 2, 2, () => true, (x, y) => {
      actual.push(y * 7 + x); grid[y][x] = [4, 5, 6];
    });
    expect(actual.sort((a, b) => a - b)).toEqual(expected);
    expect(grid[3][3]).toEqual([9, 9, 9]);
  });

  it('honours a selection predicate', () => {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    const points = [];
    visitFloodRegion(grid, 2, 2, (x, y) => x >= 1 && x <= 3 && y >= 1 && y <= 3,
      (x, y) => { points.push(`${x},${y}`); grid[y][x] = [1, 1, 1]; });
    expect(points).toHaveLength(9);
  });
});
