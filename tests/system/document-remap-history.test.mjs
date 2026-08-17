/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { activeFrameId, duplicateFrame, ensureAnimator,
  selectFrame } from '../../src/core/animation.js';
import { applyCropRect } from '../../src/core/document.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { dirtyAll } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { addTile, createTileset } from '../../src/core/tileset.js';
import { makeTilemapLayer, setCell } from '../../src/core/tilemap.js';
import { normalizeTextSource } from '../../src/logic/text-model.js';
import { rotateCanvas } from '../../src/systems/rotate-canvas.js';

const rgba = (red) => [red, 2, 3, 255];

function reset() {
  S.W = 6; S.H = 4; S.cur = 0; S.layers = [newLayer('Paint', 6, 4)];
  S.folders = []; S.animator = null; S.tilesets = []; S.tilesetSeq = 0;
  S.activeTile = null; S.undoStack = []; S.redoStack = [];
  S.marked = new Set(); S.markedFolders = new Set(); S.fxSel = new Set();
  S.sel = S.selMask = S.selFloat = S.rotMode = null;
  S.view = { zoom: 8, ox: 0, oy: 0 }; dirtyAll({ preserveGridBounds: true });
}

describe('document remap history', () => {
  beforeEach(reset);

  it('swaps dimensions and raster references while preserving layer identity', () => {
    const layer = S.layers[0], beforeGrid = layer.grid, beforeExt = layer.ext;
    layer.grid[1][2] = rgba(10); layer.ext.set('7,1', rgba(11));
    applyCropRect(1, 1, 4, 3);
    const afterGrid = layer.grid, afterExt = layer.ext;
    expect(S.undoStack.at(-1)?.kind).toBe('document-remap-patch');
    expect(S.layers[0]).toBe(layer); expect([S.W, S.H]).toEqual([4, 3]);
    expect(layer.grid[0][1]).toEqual(rgba(10));

    doUndo(); expect(S.layers[0]).toBe(layer); expect([S.W, S.H]).toEqual([6, 4]);
    expect(layer.grid).toBe(beforeGrid); expect(layer.ext).toBe(beforeExt);
    doRedo(); expect([S.W, S.H]).toEqual([4, 3]);
    expect(layer.grid).toBe(afterGrid); expect(layer.ext).toBe(afterExt);
  });

  it('remaps every animation frame and restores the exact frame map', () => {
    S.layers[0].grid[1][1] = rgba(20); ensureAnimator();
    const first = activeFrameId(), second = duplicateFrame();
    S.layers[0].grid[2][3] = rgba(30); selectFrame(first);
    const layer = S.layers[0], beforeFrames = S.animator.frames;
    const firstGrid = beforeFrames[first].layers[0].grid;
    const secondGrid = beforeFrames[second].layers[0].grid;

    applyCropRect(1, 1, 4, 3); const afterFrames = S.animator.frames;
    expect(afterFrames).not.toBe(beforeFrames);
    expect(beforeFrames[first].layers[0].grid).toBe(firstGrid);
    expect(beforeFrames[second].layers[0].grid).toBe(secondGrid);
    expect(afterFrames[second].layers[0].grid[1][2]).toEqual(rgba(30));

    doUndo(); expect(S.layers[0]).toBe(layer); expect(S.animator.frames).toBe(beforeFrames);
    expect([S.W, S.H]).toEqual([6, 4]);
    doRedo(); expect(S.animator.frames).toBe(afterFrames);
    expect([S.W, S.H]).toEqual([4, 3]);
  });

  it('keeps live text editable across crop Undo and Redo', () => {
    const layer = newLayer('Text', 6, 4); layer.kind = 'text';
    layer.text = normalizeTextSource({ value: 'Hi', box: { x: 2, y: 1, w: 3, h: 2 } });
    S.layers = [layer]; const beforeText = layer.text;
    applyCropRect(1, 1, 4, 3); const afterText = layer.text;
    expect(afterText.box).toMatchObject({ x: 1, y: 0 });
    doUndo(); expect(layer.text).toBe(beforeText);
    doRedo(); expect(layer.text).toBe(afterText);
  });

  it('isolates tile variants so full-canvas rotation is exactly reversible', () => {
    S.W = S.H = 4; const tileset = createTileset('Set', 2, 2);
    const tile = addTile(tileset); tile.grid[0][0] = rgba(40);
    const layer = makeTilemapLayer('Map', tileset.id, 2, 2);
    S.layers = [layer]; setCell(0, 0, 0, { tileId: tile.id });
    const before = { tilemap: layer.tilemap, grid: layer.grid,
      tilesets: S.tilesets };
    rotateCanvas(); const after = { tilemap: layer.tilemap, grid: layer.grid,
      tilesets: S.tilesets };
    expect(after.tilesets).not.toBe(before.tilesets);
    expect(before.tilesets[0].tiles).toHaveLength(1);
    expect(after.tilesets[0].tiles.length).toBeGreaterThan(1);
    doUndo(); expect(layer.tilemap).toBe(before.tilemap);
    expect(layer.grid).toBe(before.grid); expect(S.tilesets).toBe(before.tilesets);
    doRedo(); expect(layer.tilemap).toBe(after.tilemap);
    expect(layer.grid).toBe(after.grid); expect(S.tilesets).toBe(after.tilesets);
  });
});
