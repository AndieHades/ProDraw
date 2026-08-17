/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import * as bus from '../../src/core/bus.js';
import { newLayer, S } from '../../src/core/state.js';
import { doRedo, doUndo, snapshot, snapshotDescriptors } from '../../src/core/history.js';

function reset() {
  S.W = 2; S.H = 2; S.cur = 0;
  S.layers = [newLayer('layer', 2, 2), newLayer('other', 2, 2)];
  delete S.layers[0].opacity;
  S.folders = [{ id: 4, name: 'folder', visible: true, effects: [] }];
  S.bg = { color: [255, 255, 255], visible: true };
  S.undoStack = []; S.redoStack = []; S.sel = S.selFloat = S.rotMode = null;
  S.marked = new Set(); S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
}

describe('descriptor history', () => {
  beforeEach(reset);

  it('swaps exact metadata without reading or retaining raster grids', () => {
    const grid = S.layers[0].grid; let gridReads = 0;
    Object.defineProperty(S.layers[0], 'grid', { configurable: true,
      get: () => { gridReads += 1; return grid; } });
    expect(snapshotDescriptors([
      { kind: 'layer', index: 0, properties: ['name', 'opacity', 'visible'] },
      { kind: 'folder', id: 4, properties: ['name', 'visible'] },
      { kind: 'background', properties: ['color', 'visible'] },
    ])).toBe(true);
    expect(gridReads).toBe(0); expect(S.undoStack).toHaveLength(1);
    expect(S.undoStack[0].kind).toBe('descriptor-patch');
    expect(S.undoStack[0]).not.toHaveProperty('layers');

    S.layers[0].name = 'changed'; S.layers[0].opacity = 0.4; S.layers[0].visible = false;
    S.folders[0].name = 'changed folder'; S.folders[0].visible = false;
    S.bg.color = [1, 2, 3]; S.bg.visible = false;
    let layers = 0, renders = 0;
    const offLayers = bus.on('layers', () => layers++);
    const offRender = bus.on('render', () => renders++);
    doUndo();
    expect(S.layers[0].name).toBe('layer'); expect(S.layers[0].visible).toBe(true);
    expect(Object.hasOwn(S.layers[0], 'opacity')).toBe(false);
    expect(S.folders[0]).toMatchObject({ name: 'folder', visible: true });
    expect(S.bg).toEqual({ color: [255, 255, 255], visible: true });
    doRedo(); offLayers(); offRender();
    expect(S.layers[0]).toMatchObject({ name: 'changed', opacity: 0.4, visible: false });
    expect(S.bg).toEqual({ color: [1, 2, 3], visible: false });
    expect(gridReads).toBe(0); expect(layers).toBe(2); expect(renders).toBe(2);
  });

  it('rejects raster/effect fields and resolves after a structural snapshot', () => {
    for (const property of ['grid', 'ext', 'effects']) {
      expect(snapshotDescriptors({ kind: 'layer', index: 0,
        properties: [property] })).toBe(false);
    }
    expect(S.undoStack).toHaveLength(0);
    snapshotDescriptors({ kind: 'folder', id: 4, properties: ['name'] });
    S.folders[0].name = 'after'; snapshot();
    S.layers.unshift(newLayer('inserted', 2, 2));
    doUndo(); expect(S.folders[0].name).toBe('after');
    doUndo(); expect(S.folders[0].name).toBe('folder');
    doRedo(); expect(S.folders[0].name).toBe('after');
    doRedo(); expect(S.layers[0].name).toBe('inserted');
  });
});
