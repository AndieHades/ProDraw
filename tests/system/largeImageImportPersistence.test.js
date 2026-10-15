import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';

// Gallery previews need a real 2D canvas; the round trip here is about pixels.
vi.mock('../../src/systems/gallery/record-preview.js', () => ({
  renderGalleryPreview: async (isCurrent) => (isCurrent() ? 'data:image/png;base64,' : null),
}));

const { S } = await import('../../src/core/state.ts');
const { getDoc } = await import('../../src/core/storage.ts');
const { addImageLayerTop } = await import('../../src/core/document.js');
const { doRedo, doUndo, snapshot } = await import('../../src/core/history.js');
const gallery = await import('../../src/systems/gallery/doc.js');

const WIDTH = 6, HEIGHT = 5;
function image(seed) {
  const bytes = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let i = 0; i < WIDTH * HEIGHT; i++)
    bytes.set([(i * 37 + seed) % 256, i * 5, seed, [0, 1, 7, 8, 254, 255][i % 6]], i * 4);
  return bytes;
}
const pixel = (bytes, x, y) => { const offset = (y * WIDTH + x) * 4;
  return bytes[offset + 3] ? [...bytes.subarray(offset, offset + 4)] : null; };
const cellAt = (layer, x, y) => (x >= 0 && y >= 0 && x < S.W && y < S.H
  ? layer.grid[y][x] : layer.ext.get(`${x},${y}`)) ?? null;
function expectImage(layer, bytes, left, top) {
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++)
    expect(cellAt(layer, x + left, y + top)).toEqual(pixel(bytes, x, y));
}

describe('large photo import persistence', () => {
  it('saves a gallery image as packed rows and reopens identical pixels', async () => {
    globalThis.indexedDB = new IDBFactory();
    const photo = image(3);
    expect(await gallery.newWorkFromImage(WIDTH, HEIGHT, photo, 'photo', 'png',
      'C:/Art/photo.png')).toBe(true);
    const id = gallery.curWorkId(), stored = await getDoc(id);
    expect(stored.layers).toHaveLength(1);
    expect(stored.layers[0]).toMatchObject({ grid: [],
      rasterRows: { format: 'rgba-rows-v1', width: WIDTH, height: HEIGHT } });
    expect(stored).toMatchObject({ sourceFormat: 'png', sourceLocation: 'C:/Art/photo.png' });

    expect(await gallery.newWorkFromImage(WIDTH, HEIGHT, image(9), 'other', null, null))
      .toBe(true);
    expect(S).toMatchObject({ sourceFormat: null, sourceLocation: null });
    expect(await gallery.openWork(id)).toBe(true);
    expect(S).toMatchObject({ W: WIDTH, H: HEIGHT, docName: 'photo',
      sourceFormat: 'png', sourceLocation: 'C:/Art/photo.png' });
    expectImage(S.layers[0], photo, 0, 0);
  });

  it('inserts a packed top layer with exact Undo, Redo, autosave and reopen', async () => {
    globalThis.indexedDB = new IDBFactory();
    expect(await gallery.createNewWork(4, 3, 'canvas', null)).toBe(true);
    const id = gallery.curWorkId(), photo = image(5);
    snapshot(); addImageLayerTop(WIDTH, HEIGHT, photo, 'photo');
    expect(S.layers.map(({ name }) => name)).toEqual([expect.any(String), 'photo']);
    expectImage(S.layers[1], photo, -1, -1);

    doUndo(); expect(S.layers).toHaveLength(1);
    doRedo(); expect(S.layers).toHaveLength(2);
    expectImage(S.layers[1], photo, -1, -1);

    gallery.autosave(); expect(await gallery.saveCurrent()).toBe(true);
    const stored = await getDoc(id);
    expect(stored.layers[1].rasterRows).toMatchObject({ format: 'rgba-rows-v1' });
    expect(stored.layers[1].ext).toMatchObject({ format: 'rgba-ext-rows-v1' });

    expect(await gallery.createNewWork(2, 2, 'away', null)).toBe(true);
    expect(await gallery.openWork(id)).toBe(true);
    expect(S.layers.map(({ name }) => name)).toEqual([expect.any(String), 'photo']);
    expectImage(S.layers[1], photo, -1, -1);
  });
});
