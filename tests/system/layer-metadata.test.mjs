/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import * as bus from '../../src/core/bus.ts';
import { newLayer, S } from '../../src/core/state.js';
import { doRedo, doUndo } from '../../src/core/history.js';
import { renameMetadata, snapshotOpacity, toggleAlphaLock,
  toggleBackgroundVisibility, toggleClip, toggleLock, toggleReference,
  toggleSymmetryLock, toggleVisibility } from '../../src/systems/layers/metadata.js';

function reset() {
  S.W = 2; S.H = 2; S.cur = 0;
  S.layers = [newLayer('one', 2, 2), newLayer('two', 2, 2)];
  S.folders = [{ id: 8, name: 'folder', visible: true, symLock: false,
    opacity: 1, effects: [] }];
  S.bg = { color: [255, 255, 255], visible: true };
  S.undoStack = []; S.redoStack = []; S.sel = S.selFloat = S.rotMode = null;
  S.marked = new Set(); S.fxSel = new Set(); S.fxCur = null; S.fxDraft = null;
}

describe('layer metadata commands', () => {
  beforeEach(reset);

  it('uses one descriptor entry for layer toggles and preserves UI events', () => {
    let layerEvents = 0, renderEvents = 0;
    const offLayer = bus.on('layers', () => layerEvents++);
    const offRender = bus.on('render', () => renderEvents++);
    toggleLock(S.layers[0]); expect(S.layers[0].lock).toBe(true);
    expect(S.undoStack.at(-1).kind).toBe('descriptor-patch'); expect(layerEvents).toBe(1);
    doUndo(); expect(S.layers[0].lock).toBe(false);
    doRedo(); expect(S.layers[0].lock).toBe(true);
    toggleAlphaLock(S.layers[0]); toggleClip(S.layers[0]);
    offLayer(); offRender();
    expect(S.layers[0]).toMatchObject({ alphaLock: true, clip: true });
    expect(layerEvents).toBe(5); expect(renderEvents).toBe(3);
  });

  it('records exclusive reference changes for all layers in one entry', () => {
    S.layers[1].reference = true; toggleReference(S.layers[0]);
    expect(S.undoStack).toHaveLength(1);
    expect(S.layers.map((layer) => layer.reference)).toEqual([true, false]);
    doUndo(); expect(S.layers.map((layer) => layer.reference)).toEqual([false, true]);
    doRedo(); expect(S.layers.map((layer) => layer.reference)).toEqual([true, false]);
  });

  it('covers folder, visibility, opacity and background metadata', () => {
    expect(renameMetadata(S.folders[0], 'renamed')).toBe(true);
    expect(toggleSymmetryLock(S.folders[0])).toBe(true);
    expect(toggleVisibility(S.layers[0])).toBe(true);
    expect(snapshotOpacity(S.folders[0])).toBe(true); S.folders[0].opacity = 0.25;
    expect(toggleBackgroundVisibility()).toBe(true);
    expect(S.undoStack.every((entry) => entry.kind === 'descriptor-patch')).toBe(true);
    doUndo(); expect(S.bg.visible).toBe(true);
    doUndo(); expect(S.folders[0].opacity).toBe(1);
  });

  it('routes effect opacity through the effect metadata patch', () => {
    const effect = { id: 5, type: 'stroke', visible: true, opacity: 1,
      params: { size: 2 } };
    S.layers[0].effects = [effect];
    expect(snapshotOpacity(effect)).toBe(true); effect.opacity = 0.3;
    expect(S.undoStack[0].kind).toBe('effects-patch');
    doUndo(); expect(S.layers[0].effects[0].opacity).toBe(1);
    doRedo(); expect(S.layers[0].effects[0].opacity).toBe(0.3);
  });
});
