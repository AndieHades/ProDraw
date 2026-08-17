import { describe, expect, it } from 'vitest';
import { CANVAS_PRESETS } from '../../src/config/canvasPresets.ts';
import { CANVAS_PALETTE_LIMIT, PALETTE_SAMPLE_MAX_SIDE } from
  '../../src/config/palette-sampling.js';
import { PaletteCompositeCache } from '../../src/core/palette-composite-cache.js';
import { paletteFromCanvasSource, paletteFromPointSource,
  paletteSampleSize } from '../../src/core/palette-sampling.js';

const A4 = CANVAS_PRESETS.find((preset) => preset.id === 'a4-p');

function canvasFactory(log, color = [12, 34, 56, 255]) {
  return (width, height) => { log.allocations.push([width, height]);
    return { getContext: () => ({ drawImage(...args) { log.draws.push(args.slice(1)); },
      getImageData(x, y, w, h) { log.reads.push([x, y, w, h]);
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) data.set(color, i);
        return { data }; } }) }; };
}

describe('bounded A4 palette sampling', () => {
  it('allocates and reads only the configured presentation sample', () => {
    const log = { allocations: [], draws: [], reads: [] };
    const result = paletteFromCanvasSource({}, A4.width, A4.height, {
      limit: CANVAS_PALETTE_LIMIT, createCanvas: canvasFactory(log),
    });
    const size = paletteSampleSize(A4.width, A4.height);
    expect(size).toMatchObject({ width: 156, height: PALETTE_SAMPLE_MAX_SIDE });
    expect(log.allocations).toEqual([[size.width, size.height]]);
    expect(log.reads).toEqual([[0, 0, size.width, size.height]]);
    expect(size.width * size.height).toBeLessThan(A4.width * A4.height / 200);
    expect(result.colors).toEqual([[12, 34, 56]]);
  });

  it('cancels before readback and bounds the no-cache point fallback', () => {
    const log = { allocations: [], draws: [], reads: [] }; let checks = 0;
    const stopped = paletteFromCanvasSource({}, A4.width, A4.height, {
      createCanvas: canvasFactory(log), isCancelled: () => ++checks > 1,
    });
    expect(stopped.cancelled).toBe(true); expect(log.draws).toHaveLength(1);
    expect(log.reads).toEqual([]);
    let visits = 0;
    const fallback = paletteFromPointSource(A4.width, A4.height, () => {
      visits += 1; return [80, 90, 100, 255];
    }, { limit: CANVAS_PALETTE_LIMIT });
    expect(visits).toBe(156 * PALETTE_SAMPLE_MAX_SIDE);
    expect(fallback.colors).toEqual([[80, 90, 100]]);
  });

  it('preserves exact small-source colors and committed-cache validity', () => {
    const colors = [[200, 120, 50, 255], [23, 32, 56, 255],
      [20, 20, 20, 255], [37, 86, 46, 255]];
    const sampled = paletteFromPointSource(4, 1, (x) => colors[x],
      { limit: CANVAS_PALETTE_LIMIT });
    expect(sampled.colors).toEqual(colors.map((color) => color.slice(0, 3)));
    const state = { W: 4, H: 1, bg: null, layers: [], folders: [] };
    const cache = new PaletteCompositeCache(), canvas = {};
    cache.accept({ canvas, width: 4, height: 1 }, state, 7);
    expect(cache.current(state, 7)?.canvas).toBe(canvas);
    state.layers.push({ visible: true, opacity: 0.5, effects: [] });
    expect(cache.current(state, 7)).toBeNull();
    state.layers.length = 0; state.moveDrag = {};
    cache.accept({ canvas, width: 4, height: 1 }, state, 8);
    expect(cache.current(state, 8)).toBeNull();
  });
});
