import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo } from '../../src/core/history.js';
import { markDirty } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { beginLegacyTileEdit, cancelLegacyTileEdit,
  commitLegacyTileEdit } from '../../src/core/history/legacyTileHistory.js';
import { rasterOwnerForLayer } from '../../src/core/raster/legacyRasterOwner.ts';
import { createLegacyTileEntry,
  trimLegacyTileStack } from '../../src/core/history/legacyTilePatch.ts';

const color = (value) => [value, value + 1, value + 2, 255];

describe('legacy tiled history bridge', () => {
  beforeEach(() => {
    S.W = 8; S.H = 8; S.layers = [newLayer('Paint', 8, 8)]; S.cur = 0;
    S.undoStack = []; S.redoStack = []; S.rotMode = null; S.sel = null;
    S.selMask = null; S.selFloat = null;
  });

  it('records one tile patch and restores exact pixels through Undo/Redo', () => {
    const layer = S.layers[0], owner = rasterOwnerForLayer(layer);
    expect(beginLegacyTileEdit('Stroke')).toBe(true);
    owner.setCell(2, 3, color(10)); owner.setCell(6, 1, color(20));
    expect(commitLegacyTileEdit()).toBe(true);
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('legacy-tile-patch');
    expect(S.undoStack[0].changeSet.patches[0].after).toBeNull();

    doUndo();
    expect(layer.grid[3][2]).toBeNull(); expect(layer.grid[1][6]).toBeNull();
    doRedo();
    expect(layer.grid[3][2]).toEqual(color(10));
    expect(layer.grid[1][6]).toEqual(color(20));
  });

  it('cancels an open edit without adding history', () => {
    const layer = S.layers[0], owner = rasterOwnerForLayer(layer);
    owner.setCell(1, 1, color(4)); markDirty(0);
    expect(beginLegacyTileEdit('Stroke')).toBe(true);
    owner.setCell(1, 1, color(9)); owner.setCell(2, 2, color(12));
    expect(cancelLegacyTileEdit()).toBe(true);
    expect(layer.grid[1][1]).toEqual(color(4));
    expect(layer.grid[2][2]).toBeNull(); expect(S.undoStack).toHaveLength(0);
  });

  it('rebuilds a lazy tile after a direct compatibility-grid mutation', () => {
    const layer = S.layers[0], owner = rasterOwnerForLayer(layer);
    owner.setCell(1, 1, color(2)); markDirty(0);
    expect(beginLegacyTileEdit('First')).toBe(true);
    owner.setCell(1, 1, color(3)); expect(commitLegacyTileEdit()).toBe(true);
    layer.grid[1][1] = color(7); markDirty(0); S.undoStack = [];

    expect(beginLegacyTileEdit('Second')).toBe(true);
    owner.setCell(1, 1, color(8)); expect(commitLegacyTileEdit()).toBe(true);
    doUndo(); expect(layer.grid[1][1]).toEqual(color(7));
  });

  it('drops an exact history prefix when tile bytes exceed the budget', () => {
    const layer = S.layers[0], owner = rasterOwnerForLayer(layer);
    const entry = (value) => createLegacyTileEntry(0, layer, owner, 8, 8, {
      label: 'budget', patches: [{ surfaceId: owner.id, x: 0, y: 0,
        before: new Uint8ClampedArray(8).fill(value), after: null }] });
    const stack = [{ kind: 'older' }, entry(1), { kind: 'middle' }, entry(2)];
    trimLegacyTileStack(stack, 8);
    expect(stack.map(({ kind }) => kind)).toEqual(['middle', 'legacy-tile-patch']);
  });
});
