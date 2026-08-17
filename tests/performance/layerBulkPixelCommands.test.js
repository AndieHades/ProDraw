/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { CANVAS_PRESETS } from '../../src/config/canvasPresets.ts';
import { S, blank } from '../../src/core/state.js';
import { dirtyAll, markDirty } from '../../src/core/layer-cache.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { fillLayerRefs, fillWholeLayerRefs } from '../../src/systems/layers/fill.js';
import { clearLayerRefs } from '../../src/systems/layers/ops.js';

const A4 = CANVAS_PRESETS.find((preset) => preset.id === 'a4-p');
const bounds = { minx: 1200, miny: 1700, maxx: 1215, maxy: 1715 };

function resetLayer(width, height, ext = new Map()) {
  S.W = width; S.H = height; S.folders = []; S.cur = 0;
  S.marked = new Set(); S.undoStack = []; S.redoStack = [];
  const grid = blank(1, height);
  for (const row of grid) row.length = width;
  const layer = { name: 'Paint', kind: 'pixel', grid, ext, effects: [],
    opacity: 1, visible: true, fid: null, clip: false };
  S.layers = [layer]; dirtyAll({ preserveGridBounds: true }); return layer;
}

function observeGridReads(grid, area) {
  const reads = { rows: 0, cells: 0, outsideRows: 0, outsideCells: 0 };
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    const proxy = new Proxy(row, { get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) {
        reads.cells++; const x = Number(key);
        if (y < area.miny || y > area.maxy || x < area.minx || x > area.maxx) {
          reads.outsideCells++;
        }
      }
      return Reflect.get(target, key, receiver);
    } });
    Object.defineProperty(grid, y, { configurable: true, enumerable: true,
      get() { reads.rows++; if (y < area.miny || y > area.maxy) reads.outsideRows++; return proxy; } });
  }
  return reads;
}

describe('bounded layer bulk pixel commands', () => {
  beforeEach(() => { S.palette = []; S.active = [20, 30, 40]; });

  it('recolors and clears sparse A4 content without reading empty canvas rows', () => {
    const layer = resetLayer(A4.width, A4.height);
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      for (let x = bounds.minx; x <= bounds.maxx; x++) {
        if ((x + y) % 5 === 0) layer.grid[y][x] = [1, 2, 3, 128];
      }
    }
    markDirty(0, bounds); const originalGrid = layer.grid;
    const reads = observeGridReads(layer.grid, bounds);

    expect(fillLayerRefs([layer], [90, 80, 70])).toBe(true);
    expect(layer.grid).toBe(originalGrid);
    expect(layer.grid[bounds.miny][bounds.minx]).toEqual([90, 80, 70, 128]);
    let entry = S.undoStack.at(-1);
    expect(entry.kind).toBe('pixel-batch');
    expect(entry.patches[0].snapshot).toBeUndefined();
    doUndo(); expect(layer.grid[bounds.miny][bounds.minx]).toEqual([1, 2, 3, 128]);
    doRedo(); expect(layer.grid[bounds.miny][bounds.minx]).toEqual([90, 80, 70, 128]);
    expect(reads.outsideRows).toBe(0);

    const beforeClear = layer.grid;
    expect(clearLayerRefs([layer])).toBe(true);
    expect(reads.outsideRows).toBe(0);
    const cleared = layer.grid;
    expect(cleared === beforeClear).toBe(false);
    expect(layer.grid[bounds.miny][bounds.minx]).toBeNull();
    entry = S.undoStack.at(-1);
    expect(entry.kind).toBe('raster-reference-patch');
    doUndo(); expect(layer.grid).toBe(beforeClear);
    expect(layer.grid[bounds.miny][bounds.minx]).toEqual([90, 80, 70, 128]);
    expect(reads.outsideRows).toBe(0);
    doRedo(); expect(layer.grid).toBe(cleared);
    expect(reads.outsideRows).toBe(0); expect(reads.outsideCells).toBe(0);
    expect(reads.cells).toBeLessThan(4096);
  });

  it('swaps one reversible raster reference for whole-layer fill', () => {
    const layer = resetLayer(A4.width, A4.height), grid = layer.grid;
    expect(fillWholeLayerRefs([layer], [7, 8, 9])).toBe(true);
    expect(layer.grid).not.toBe(grid);
    expect(layer.grid[A4.height - 1][A4.width - 1]).toEqual([7, 8, 9, 255]);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    doUndo(); expect(layer.grid).toBe(grid);
    expect(layer.grid[A4.height - 1][A4.width - 1]).toBeNull();
    doRedo(); expect(layer.grid[A4.height - 1][A4.width - 1]).toEqual([7, 8, 9, 255]);
  });

  it('keeps off-canvas pixels in one reference-backed layer edit', () => {
    const layer = resetLayer(8, 8, new Map([['-1,0', [4, 5, 6, 200]]]));
    layer.grid[2][2] = [1, 2, 3, 128]; markDirty(0, { minx: 2, miny: 2, maxx: 2, maxy: 2 });
    expect(fillLayerRefs([layer], [9, 8, 7])).toBe(true);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(layer.ext.get('-1,0')).toEqual([9, 8, 7, 200]);
    doUndo(); expect(S.layers[0].ext.get('-1,0')).toEqual([4, 5, 6, 200]);
  });
});
