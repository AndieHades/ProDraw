/** @vitest-environment jsdom */
/* global document */
import { beforeEach, describe, expect, it } from 'vitest';
import { CANVAS_PRESETS } from '../../src/config/canvasPresets.ts';
import { SELECTION_ANTS } from '../../src/config/selection-ants.ts';
import { S, blank } from '../../src/core/state.js';
import { doUndo } from '../../src/core/history.js';
import { inSel } from '../../src/core/selection.js';
import { dirtyAll, markDirty } from '../../src/core/layer-cache.js';
import { selectionMaskStats } from '../../src/logic/mask-ops.js';
import { deleteSelContent, fillSelection, invertSelection } from '../../src/systems/selection/model.js';
import { updateAnts } from '../../src/systems/render/ants.js';
import { flipSelection } from '../../src/systems/selection-transform.js';

const A4 = CANVAS_PRESETS.find((preset) => preset.id === 'a4-p');
const hole = { x0: 1200, y0: 1700, x1: 1215, y1: 1715 };
const content = { minx: 1198, miny: 1698, maxx: 1220, maxy: 1720 };

function reset(width, height) { S.W = width; S.H = height; S.cur = 0; S.folders = [];
  S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.undoStack = []; S.redoStack = []; S.sel = null; S.selMask = null; S.selFloat = null;
  const grid = width * height <= 4096 ? blank(width, height) : blank(1, height);
  if (grid[0].length !== width) for (const row of grid) row.length = width;
  S.layers = [{ name: 'Paint', kind: 'pixel', grid, ext: new Map(), effects: [],
    opacity: 1, visible: true, fid: null, clip: false }]; S.active = [20, 30, 40];
  dirtyAll({ preserveGridBounds: true }); return grid; }

function observeReads(grid, area) { const reads = { cells: 0, outside: 0, outsideKeys: [] };
  for (let y = 0; y < grid.length; y++) { const row = grid[y], proxy = new Proxy(row, {
    get(target, key, receiver) { if (typeof key === 'string' && /^\d+$/.test(key)) {
      const x = Number(key); reads.cells++; if (y < area.miny || y > area.maxy ||
        x < area.minx || x > area.maxx) { reads.outside++; reads.outsideKeys.push([x, y]); } }
      return Reflect.get(target, key, receiver); },
  }); Object.defineProperty(grid, y, { configurable: true, get: () => proxy }); }
  return reads; }

describe('A4 compact selection performance', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('inverts a rectangle with O(1) mask storage and perimeter-only ants', () => {
    reset(A4.width, A4.height);
    S.sel = { ...hole }; invertSelection(); const mask = S.selMask;
    expect(mask).not.toBeInstanceOf(Set); expect(selectionMaskStats(mask)).toEqual({
      rects: 1, complement: true, include: { tiles: 0, points: 0 },
      exclude: { tiles: 0, points: 0 },
    });
    expect(mask.size).toBe(A4.width * A4.height - 256);
    expect(inSel(0, 0)).toBe(true); expect(inSel(1204, 1704)).toBe(false);
    mask[Symbol.iterator] = () => { throw new Error('dense selection iteration'); };
    updateAnts(0, 0, 1); const svg = document.querySelector('#sel-ants');
    expect(svg.querySelector('.fg').getAttribute('d').match(/M/g)).toHaveLength(8);
    expect(svg.style.getPropertyValue('--ants-dash')).toBe(SELECTION_ANTS.dashPx + 'px');
    expect(svg.style.getPropertyValue('--ants-gap')).toBe(SELECTION_ANTS.gapPx + 'px');
    expect(svg.style.getPropertyValue('--ants-line-width')).toBe('1.75px');
    expect(svg.style.getPropertyValue('--ants-period')).toBe('1200ms');
    expect(SELECTION_ANTS).toMatchObject({ dashPx: 12, gapPx: 8 });
  });

  it('deletes only selected sparse content inside cached A4 bounds', () => {
    const grid = reset(A4.width, A4.height);
    grid[1698][1198] = [1, 2, 3, 255]; grid[1705][1205] = [4, 5, 6, 255];
    grid[1720][1220] = [7, 8, 9, 255]; markDirty(0, content);
    const reads = observeReads(grid, content); S.sel = { ...hole }; invertSelection();
    expect(deleteSelContent()).toBe(true);
    const result = S.layers[0].grid;
    expect(Object.is(result, grid)).toBe(false);
    expect(result[1698][1198]).toBeNull(); expect(result[1720][1220]).toBeNull();
    expect(result[1705][1205]).toEqual([4, 5, 6, 255]);
    expect(reads.outsideKeys).toEqual([]); expect(reads.cells).toBeLessThan(4096);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
  });

  it('fills a dense A4 complement with one raster reference and no coordinate strings', () => {
    const source = reset(A4.width, A4.height); source[1705][1205] = [9, 8, 7, 255];
    source[100][100] = [1, 2, 3, 255]; markDirty(0, { minx: 100, miny: 100, maxx: 1205, maxy: 1705 });
    S.sel = { ...hole }; invertSelection(); const mask = S.selMask;
    mask[Symbol.iterator] = () => { throw new Error('dense coordinate strings'); };
    fillSelection();
    expect(S.layers[0].grid).not.toBe(source);
    expect(S.layers[0].grid[100][100]).toEqual([20, 30, 40, 255]);
    expect(S.layers[0].grid[1705][1205]).toEqual([9, 8, 7, 255]);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    expect(S.undoStack.at(-1).cells).toBeUndefined();
  });

  it('fills the complement while preserving the rectangular hole', () => {
    const grid = reset(8, 8); S.sel = { x0: 2, y0: 2, x1: 3, y1: 3 };
    invertSelection(); fillSelection();
    const result = S.layers[0].grid; expect(result).not.toBe(grid);
    expect(result[0][0]).toEqual([20, 30, 40, 255]); expect(result[7][7]).toEqual([20, 30, 40, 255]);
    expect(result[2][2]).toBeNull(); expect(result[3][3]).toBeNull();
  });

  it('flips sparse A4 paint and the dense mask without materializing either', () => {
    const source = reset(A4.width, A4.height);
    source[1698][1198] = [1, 2, 3, 255];
    source[1705][1205] = [9, 8, 7, 255];
    markDirty(0, content);
    S.sel = { ...hole };
    invertSelection();
    S.selMask[Symbol.iterator] = () => { throw new Error('dense selection iteration'); };
    expect(flipSelection(true)).toBe(true);
    const flipped = S.layers[0].grid;
    expect(Object.is(flipped, source)).toBe(false);
    expect(flipped[1698][A4.width - 1 - 1198]).toEqual([1, 2, 3, 255]);
    expect(flipped[1705][1205]).toEqual([9, 8, 7, 255]);
    expect(S.selMask.hasXY(A4.width - 1 - 1205, 1705)).toBe(false);
    expect(S.undoStack.at(-1).kind).toBe('raster-reference-patch');
    S.sel = null; S.selMask = null;
    doUndo();
    expect(Object.is(S.layers[0].grid, source)).toBe(true);
  });
});
