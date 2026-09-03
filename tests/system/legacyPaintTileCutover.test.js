/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { doRedo, doUndo } from '../../src/core/history.js';
import { markDirty } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { rasterOwnerForLayer } from '../../src/core/raster/legacyRasterOwner.ts';
import { createCellPainter } from '../../src/systems/draw/cells.js';
import { brushStamp } from '../../src/systems/draw/brush.js';
import { floodAt } from '../../src/systems/draw/fill.js';
import { afterStroke, beginStroke,
  cancelStroke } from '../../src/systems/draw/stroke.js';

const rgba = (value) => [value, value + 1, value + 2, 255];

describe('legacy paint tools on tiled RGBA history', () => {
  beforeEach(() => {
    S.W = 16; S.H = 12; S.layers = [newLayer('Paint', S.W, S.H)]; S.cur = 0;
    S.undoStack = []; S.redoStack = []; S.tool = 'pencil'; S.active = [9, 8, 7];
    S.sel = S.selMask = S.selFloat = S.rotMode = null; S.tile = { on: false };
    S.bgSel = false; S.sym = S.symH = S.symD1 = S.symD2 = false;
  });

  it('commits pencil cells as one tile entry and redoes exact RGBA', () => {
    beginStroke(); const painter = createCellPainter(false);
    painter.paint(3, 4, 1); painter.paint(4, 4, 0.5); painter.flush();
    S.stroke = false; afterStroke();
    expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('legacy-tile-patch');
    const committed = S.layers[0].grid[4][4].slice();
    doUndo(); expect(S.layers[0].grid[4][3]).toBeNull();
    doRedo(); expect(S.layers[0].grid[4][4]).toEqual(committed);
  });

  it('restores eraser pixels on pointer cancellation without history', () => {
    const owner = rasterOwnerForLayer(S.layers[0]); owner.setCell(5, 5, rgba(20));
    markDirty(0); S.tool = 'eraser'; beginStroke();
    const painter = createCellPainter(true); painter.paint(5, 5, 1); painter.flush();
    expect(S.layers[0].grid[5][5]).toBeNull(); cancelStroke();
    expect(S.layers[0].grid[5][5]).toEqual(rgba(20));
    expect(S.undoStack).toHaveLength(0);
  });

  it('reuses one painter across a simple brush stroke without darkening overlaps', () => {
    S.pencilSize = 5; S.brushOpacity.pencil = 0.5; beginStroke();
    brushStamp(6, 6, false); brushStamp(6, 6, false);
    expect(S.layers[0].grid[6][6]).toEqual([9, 8, 7, 128]);
    S.stroke = false; afterStroke(); expect(S.undoStack).toHaveLength(1);
    doUndo(); expect(S.layers[0].grid[6][6]).toBeNull();
  });

  it('fills a bounded region through the same tile history', () => {
    const owner = rasterOwnerForLayer(S.layers[0]); owner.setCell(2, 2, rgba(30));
    markDirty(0); S.tool = 'fill'; floodAt(2, 2);
    expect(S.layers[0].grid[2][2]).toEqual([9, 8, 7]);
    expect(S.undoStack.at(-1).kind).toBe('legacy-tile-patch');
    doUndo(); expect(S.layers[0].grid[2][2]).toEqual(rgba(30));
  });
});
