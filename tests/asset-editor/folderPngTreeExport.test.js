/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dirtyAll } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { exportTargetPng } from '../../src/systems/export/pipeline.js';

const pixels = new WeakMap();
function contextFor(canvas) {
  if (!pixels.has(canvas)) {
    pixels.set(canvas, new Uint8ClampedArray(canvas.width * canvas.height * 4));
  }
  const data = pixels.get(canvas);
  return { canvas, globalAlpha: 1, imageSmoothingEnabled: false,
    createImageData: (width, height) => ({ width, height,
      data: new Uint8ClampedArray(width * height * 4) }), clearRect: vi.fn(),
    putImageData(image, x, y) {
      for (let row = 0; row < image.height; row++) for (let col = 0; col < image.width; col++) {
        const source = (row * image.width + col) * 4;
        const target = ((y + row) * canvas.width + x + col) * 4;
        data.set(image.data.subarray(source, source + 4), target);
      }
    },
    drawImage(source) {
      const sourceData = pixels.get(source) ?? new Uint8ClampedArray(0);
      data.set(sourceData.subarray(0, data.length));
    },
    getImageData: () => ({ data: data.slice(), width: canvas.width, height: canvas.height }),
  };
}

function resetSelection() {
  S.cur = 0; S.marked = new Set(); S.markedFolders = new Set();
  S.selFolder = null; S.fxCur = null; S.bgSel = false;
}

function writerProbe(name = 'Layers') {
  const directories = [], writes = [];
  const writer = { ensureDirectory: vi.fn(async (path) => directories.push([...path])),
    write: vi.fn(async (path, blob) => writes.push({ path: [...path], blob })),
    commit: vi.fn(async () => ({ name, location: `C:\\${name}` })),
    abort: vi.fn(async () => undefined) };
  return { directories, writes, writer,
    writerFactory: vi.fn(async () => writer) };
}

describe('selection-aware layer PNG export', () => {
  afterEach(() => { vi.restoreAllMocks(); dirtyAll(); resetSelection(); });

  it('saves one selected hidden layer without opening a tree session', async () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function () { return contextFor(this); });
    S.W = 4; S.H = 3; S.layers = [newLayer('Solo', 4, 3)]; S.folders = [];
    S.layers[0].visible = false; S.layers[0].grid[1][2] = [1, 2, 3, 255];
    dirtyAll(); const saved = [], encoded = [], writerFactory = vi.fn();
    const encode = async (canvas, name) => { encoded.push([canvas.width, canvas.height, name]);
      return { name: `${name}.png`, blob: new globalThis.Blob([]), mime: 'image/png' }; };

    await exportTargetPng(S.layers[0], false,
      { writerFactory, encode, saveOutput: async (output) => saved.push(output) });
    await exportTargetPng(S.layers[0], true,
      { writerFactory, encode, saveOutput: async (output) => saved.push(output) });

    expect(encoded).toEqual([[4, 3, 'Solo'], [1, 1, 'Solo']]);
    expect(saved.map(({ name }) => name)).toEqual(['Solo.png', 'Solo.png']);
    expect(writerFactory).not.toHaveBeenCalled();
  });

  it('exports a folder subtree at whole-canvas size in one session', async () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function () { return contextFor(this); });
    S.W = 2; S.H = 2; const visible = newLayer('Visible', 2, 2);
    const hidden = newLayer('Hidden', 2, 2); visible.fid = 1; hidden.fid = 2;
    hidden.visible = false; hidden.grid[1][1] = [9, 8, 7, 255];
    S.layers = [visible, hidden]; S.folders = [
      { id: 1, name: 'Rig', parent: null, visible: false, opacity: 1 },
      { id: 2, name: 'Nested', parent: 1, visible: false, opacity: 1 },
      { id: 3, name: 'Empty', parent: 1, visible: false, opacity: 1, emptyPos: 2 },
    ]; S.selFolder = 1; S.markedFolders = new Set([1]); dirtyAll();
    const probe = writerProbe('Rig'), dimensions = [];
    const encode = async (canvas, name) => { dimensions.push([canvas.width, canvas.height, name]);
      return { name, blob: new globalThis.Blob([
        canvas.getContext('2d').getImageData(0, 0, 2, 2).data,
      ]) }; };

    const result = await exportTargetPng(S.folders[0], false,
      { writerFactory: probe.writerFactory, encode });

    expect(result.items).toHaveLength(2); expect(probe.writerFactory).toHaveBeenCalledOnce();
    expect(probe.directories).toEqual([['Nested'], ['Empty']]);
    expect(probe.writes.map(({ path }) => path)).toEqual([
      ['Visible.png'], ['Nested', 'Hidden.png'],
    ]);
    expect(dimensions).toEqual([[2, 2, 'Visible'], [2, 2, 'Hidden']]);
    expect(new Uint8Array(await probe.writes[1].blob.arrayBuffer())[15]).toBe(255);
  });

  it('uses an unselected context folder instead of the unrelated selection', async () => {
    S.W = 2; S.H = 2; S.layers = ['A', 'B'].map((name) => newLayer(name, 2, 2));
    S.layers[0].fid = 1; S.layers[1].fid = 2; S.folders = [
      { id: 1, name: 'Selected', parent: null }, { id: 2, name: 'Context', parent: null },
    ]; S.selFolder = 1; S.markedFolders = new Set([1]);
    const probe = writerProbe('Context');
    await exportTargetPng(S.folders[1], false, { writerFactory: probe.writerFactory,
      renderLayer: () => ({ width: 2, height: 2 }),
      encode: async () => ({ blob: new globalThis.Blob([]) }) });
    expect(probe.writerFactory).toHaveBeenCalledWith('Context');
    expect(probe.writes.map(({ path }) => path)).toEqual([['B.png']]);
  });

  it('crops every selected layer independently and preserves empty output', async () => {
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function () { return contextFor(this); });
    S.W = 5; S.H = 4; S.docName = 'Selection'; S.folders = [];
    S.layers = ['One', 'Two', 'Empty'].map((name) => newLayer(name, 5, 4));
    S.layers[0].grid[2][2] = [1, 1, 1, 255];
    S.layers[1].grid[1][1] = [2, 2, 2, 255];
    S.layers[1].grid[1][2] = [2, 2, 2, 255];
    S.cur = 0; S.marked = new Set([1, 2]); dirtyAll();
    const probe = writerProbe('Selection'), dimensions = [];
    const encode = async (canvas, name) => { dimensions.push([canvas.width, canvas.height, name]);
      return { name, blob: new globalThis.Blob([]) }; };

    await exportTargetPng(S.layers[0], true,
      { writerFactory: probe.writerFactory, encode });

    expect(probe.writes.map(({ path }) => path)).toEqual([
      ['One.png'], ['Two.png'], ['Empty.png'],
    ]);
    expect(dimensions).toEqual([[1, 1, 'One'], [2, 1, 'Two'], [1, 1, 'Empty']]);
  });

  it('aborts the unpublished tree after a failed write', async () => {
    S.W = 2; S.H = 2; S.layers = [newLayer('Leaf', 2, 2)];
    S.folders = [{ id: 1, name: 'Root', parent: null }]; S.layers[0].fid = 1;
    const writer = { ensureDirectory: vi.fn(), write: vi.fn(async () => { throw new Error('disk'); }),
      commit: vi.fn(), abort: vi.fn(async () => undefined) };
    const result = await exportTargetPng(S.folders[0], false, {
      writerFactory: async () => writer, renderLayer: () => ({ width: 2, height: 2 }),
      encode: async () => ({ blob: new globalThis.Blob([]) }),
    });
    expect(result).toBeNull(); expect(writer.abort).toHaveBeenCalledOnce();
    expect(writer.commit).not.toHaveBeenCalled();
  });
});
