/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { dirtyAll } from '../../src/core/layer-cache.js';
import { newLayer, S } from '../../src/core/state.js';
import { setGridBounds } from '../../src/logic/raster.js';
import { fxApply, openFxNew } from '../../src/systems/effects/settings.js';

function mountForm() {
  globalThis.document.body.innerHTML = `
    <div id="fx-edit"><div class="fxf-size"></div><div class="fxf-intensity"></div>
      <div class="fxf-color"></div><div class="fxf-offset"></div></div>
    <div id="fx-edit-title"></div><input id="fx-size"><span id="fx-sizev"></span>
    <input id="fx-int"><span id="fx-intv"></span><input id="fx-dx"><span id="fx-dxv"></span>
    <input id="fx-dy"><span id="fx-dyv"></span><div id="fx-colsw"></div><div id="colpop"></div>`;
}

function reset(x, y) {
  S.W = 8; S.H = 8; S.cur = 0; S.layers = [newLayer('Layer', 8, 8)];
  S.layers[0].grid[y][x] = [1, 2, 3, 255];
  setGridBounds(S.layers[0].grid, { minx: x, miny: y, maxx: x, maxy: y }, true);
  S.folders = []; S.marked = new Set(); S.markedFolders = new Set();
  S.selFolder = null; S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
  S.sel = S.selFloat = S.rotMode = null; S.undoStack = []; S.redoStack = [];
  S.view = { zoom: 12, ox: 0, oy: 0 }; dirtyAll({ preserveGridBounds: true });
}

describe('effect Apply history boundary', () => {
  beforeEach(mountForm);

  it('uses an effects patch when the effect fits and an explicit full fallback on resize', () => {
    reset(4, 4); openFxNew('stroke'); fxApply();
    expect(S.undoStack).toHaveLength(1); expect(S.undoStack[0].kind).toBe('effects-patch');
    expect([S.W, S.H]).toEqual([8, 8]);

    reset(0, 0); openFxNew('stroke'); fxApply();
    expect(S.undoStack).toHaveLength(1); expect(S.undoStack[0].kind).toBeUndefined();
    expect([S.undoStack[0].W, S.undoStack[0].H]).toEqual([8, 8]);
    expect([S.W, S.H]).toEqual([9, 9]);
  });
});
