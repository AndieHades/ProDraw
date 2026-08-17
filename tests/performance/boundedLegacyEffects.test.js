import { describe, expect, it } from 'vitest';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { documentPixels, effectRegionFromGrid } from '../../src/logic/effect-region.js';

function sparseFixture(width, height, x0, y0) {
  const grid = Array.from({ length: height }, () => []);
  for (let y = y0; y < y0 + 16; y++) for (let x = x0; x < x0 + 16; x++) {
    if ((x + y) % 3) grid[y][x] = [10, 20, 30, 255];
  }
  return { grid, bounds: { minx: x0, miny: y0, maxx: x0 + 15, maxy: y0 + 15 } };
}

const normalize = (region, x0, y0) => documentPixels(region).map(([x, y, alpha]) => (
  [x - x0, y - y0, alpha]));

describe('bounded legacy effect performance', () => {
  it('keeps sparse A4 effect work independent of empty canvas area', () => {
    const small = sparseFixture(256, 256, 100, 100);
    const a4 = sparseFixture(2480, 3508, 1200, 1700);
    const effect = { type: 'glow', params: { size: 16, intensity: 0.75 } };
    const smallRegion = effectRegionFromGrid(small.grid, small.bounds, 256, 256, effect);
    const samples = [];
    let a4Region;
    for (let run = 0; run < 20; run++) {
      const start = globalThis.performance.now();
      a4Region = effectRegionFromGrid(a4.grid, a4.bounds, 2480, 3508, effect);
      samples.push(globalThis.performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    expect([a4Region.width, a4Region.height]).toEqual([48, 48]);
    expect(normalize(a4Region, 1200, 1700)).toEqual(normalize(smallRegion, 100, 100));
    expect(p95).toBeLessThan(PERFORMANCE_BUDGETS.boundedEffectP95Milliseconds);
    if (globalThis.process?.env.PRODRAW_REPORT_PERF === '1') {
      globalThis.console.info(`A4-bounded-effect: region=${a4Region.width}x${a4Region.height} ` +
        `p95=${p95.toFixed(2)}ms`);
    }
  });
});
