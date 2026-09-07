/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S, blank } from '../../src/core/state.js';
import { dirtyAll, layerFloatCanvas } from '../../src/core/layer-cache.js';

function stubContext() {
  const calls = { fillRect: 0, drawImage: [], putImageData: [] };
  vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect() {}, fillRect() { calls.fillRect += 1; },
    drawImage(...args) { calls.drawImage.push(args); },
    putImageData(image, x, y) { calls.putImageData.push({ image, x, y }); },
    createImageData: (width, height) =>
      ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    set fillStyle(_value) {}, get fillStyle() { return '#000'; }
  });
  return calls;
}

function prepare() {
  S.W = 64; S.H = 64; S.cur = 0;
  S.layers = [{ name: 'Paint', grid: blank(64, 64), opacity: 1, visible: true,
    fid: null, clip: false, kind: 'pixel', effects: [], ext: new Map() }];
  dirtyAll();
}

describe('floating fragment compositing', () => {
  afterEach(() => { S.selFloat = null; vi.restoreAllMocks(); });

  it('composites the fragment with one draw instead of a fill per pixel', () => {
    prepare();
    const cells = new Map();
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      cells.set(`${x},${y}`, [10, 20, 30, 255]);
    }
    S.selFloat = { li: 0, x: 5, y: 6, cells };
    const calls = stubContext();

    layerFloatCanvas(0);

    expect(calls.fillRect).toBe(0);
    const fragment = calls.drawImage.at(-1);
    expect(fragment.slice(1)).toEqual([5, 6]);
    expect(calls.putImageData.at(-1).image.data.slice(0, 4))
      .toEqual(new Uint8ClampedArray([10, 20, 30, 255]));
  });

  it('returns the plain layer canvas when the fragment belongs elsewhere', () => {
    prepare();
    stubContext();
    S.selFloat = { li: 1, x: 0, y: 0, cells: new Map([['0,0', [1, 2, 3, 255]]]) };
    const canvas = layerFloatCanvas(0);
    expect(canvas.width).toBe(64);
  });

  it('skips the fragment draw when every cell falls outside the document', () => {
    prepare();
    S.selFloat = { li: 0, x: -80, y: -80, cells: new Map([['0,0', [1, 2, 3, 255]]]) };
    const calls = stubContext();
    layerFloatCanvas(0);
    expect(calls.fillRect).toBe(0);
    expect(calls.drawImage).toHaveLength(1);
  });
});
