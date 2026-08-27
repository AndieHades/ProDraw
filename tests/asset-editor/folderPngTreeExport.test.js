/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dirtyAll } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { exportFolderLayersPng } from '../../src/systems/export/pipeline.js';

const pixels = new WeakMap();
function contextFor(canvas) {
  if (!pixels.has(canvas)) pixels.set(canvas, new Uint8ClampedArray(canvas.width * canvas.height * 4));
  const data = pixels.get(canvas);
  return { canvas, globalAlpha: 1, imageSmoothingEnabled: false,
    createImageData: (width, height) => ({ width, height,
      data: new Uint8ClampedArray(width * height * 4) }),
    clearRect: vi.fn(),
    putImageData(image, x, y) {
      for (let row = 0; row < image.height; row++) for (let col = 0; col < image.width; col++) {
        const source = (row * image.width + col) * 4;
        const target = ((y + row) * canvas.width + x + col) * 4;
        data.set(image.data.subarray(source, source + 4), target);
      }
    },
    drawImage(source, x = 0, y = 0) {
      const sourceData = pixels.get(source) ?? new Uint8ClampedArray(source.width * source.height * 4);
      for (let row = 0; row < source.height; row++) for (let col = 0; col < source.width; col++) {
        const from = (row * source.width + col) * 4;
        const to = ((y + row) * canvas.width + x + col) * 4;
        data.set(sourceData.subarray(from, from + 4), to);
      }
    },
    getImageData: () => ({ data: data.slice(), width: canvas.width, height: canvas.height }),
  };
}

describe('folder PNG tree export', () => {
  afterEach(() => { vi.restoreAllMocks(); dirtyAll(); });

  it('writes nested, empty and hidden layers with hidden pixels intact', async () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return contextFor(this);
    });
    S.W = 2; S.H = 2;
    const visible = newLayer('Visible', 2, 2), hidden = newLayer('Hidden', 2, 2);
    visible.fid = 1; visible.grid[0][0] = [1, 2, 3, 255];
    hidden.fid = 2; hidden.visible = false; hidden.grid[1][1] = [9, 8, 7, 255];
    S.layers = [visible, hidden];
    S.folders = [
      { id: 1, name: 'Rig', parent: null, visible: false, opacity: 1 },
      { id: 2, name: 'Nested', parent: 1, visible: false, opacity: 1 },
      { id: 3, name: 'Empty', parent: 1, visible: false, opacity: 1, emptyPos: 2 },
    ];
    dirtyAll();
    const directories = [], writes = [];
    const writer = { ensureDirectory: vi.fn(async (path) => directories.push([...path])),
      write: vi.fn(async (path, blob) => writes.push({ path: [...path], blob })),
      commit: vi.fn(async () => ({ name: 'Rig', location: 'C:\\Rig' })),
      abort: vi.fn(async () => undefined) };
    const encode = async (canvas, name) => ({ name, blob: new globalThis.Blob([
      canvas.getContext('2d').getImageData(0, 0, 2, 2).data,
    ]) });

    await exportFolderLayersPng(S.folders[0], async () => writer, undefined, encode);

    expect(directories).toEqual([['Nested'], ['Empty']]);
    expect(writes.map(({ path }) => path)).toEqual([
      ['Visible.png'], ['Nested', 'Hidden.png'],
    ]);
    expect(new Uint8Array(await writes[1].blob.arrayBuffer())[15]).toBe(255);
    expect(writer.commit).toHaveBeenCalledOnce();
  });

  it('publishes the selected folder even when its subtree is empty', async () => {
    S.layers = []; S.folders = [{ id: 4, name: 'Empty root', parent: null }];
    const writer = { ensureDirectory: vi.fn(), write: vi.fn(),
      commit: vi.fn(async () => ({ name: 'Empty root', location: 'C:\\Empty root' })),
      abort: vi.fn() };
    const result = await exportFolderLayersPng(S.folders[0], async () => writer);
    expect(result).toMatchObject({ name: 'Empty root', items: [], directories: [] });
    expect(writer.commit).toHaveBeenCalledOnce();
  });
});
