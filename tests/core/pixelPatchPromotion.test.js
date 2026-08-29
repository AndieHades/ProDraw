import { describe, expect, it } from 'vitest';
import { blank } from '../../src/logic/raster.js';
import { compactPixelEntry, createPixelBatch, recordPixel,
  swapPixelEntry } from '../../src/core/history/pixelPatch.ts';

const color = (value) => [value, value, value, 255];

describe('adaptive bulk pixel history', () => {
  it('promotes dense edits and swaps their grids without cloning on undo', () => {
    const layer = { grid: blank(3, 3) };
    const entry = createPixelBatch([0], 3, 3);
    recordPixel(entry, 0, 0, 0, null, layer.grid, 2);
    layer.grid[0][0] = color(10);
    recordPixel(entry, 0, 1, 0, null, layer.grid, 2);
    layer.grid[0][1] = color(20);
    expect(entry.patches[0].snapshot).toBeTruthy();
    expect(entry.patches[0].cells.size).toBe(0);

    const committed = compactPixelEntry(entry, [layer]);
    const changedGrid = layer.grid; const dirty = [];
    const redo = swapPixelEntry(committed, [layer], 3, 3,
      (index, bounds) => dirty.push([index, bounds]));
    expect(layer.grid[0][0]).toBeNull(); expect(layer.grid[0][1]).toBeNull();
    expect(redo.patches[0].snapshot).toBe(changedGrid);
    expect(dirty).toEqual([[0, undefined]]);

    const undo = swapPixelEntry(redo, [layer], 3, 3, () => {});
    expect(layer.grid).toBe(changedGrid);
    expect(layer.grid[0][0]).toEqual(color(10));
    expect(undo.patches[0].snapshot).toBeTruthy();
  });
});
