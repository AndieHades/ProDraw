/** @vitest-environment jsdom */
/* global document */
import { describe, expect, it, vi } from 'vitest';
import { layerIndicesAt } from '../../src/core/layer-hit.js';
import { newLayer, S } from '../../src/core/state.js';
import { layerPickerButton, selectCanvasLayer } from '../../src/systems/layers/index.js';

function reset() {
  S.W = 4; S.H = 4; S.layers = [newLayer('base', 4, 4), newLayer('hidden', 4, 4)];
  S.layers[0].grid[1][1] = [1, 2, 3, 255]; S.layers[1].grid[1][1] = [4, 5, 6, 0];
  S.layers[1].grid[2][2] = [7, 8, 9, 255]; S.layers[1].visible = false;
  S.folders = [{ id: 1, name: 'closed', open: false, visible: false, parent: null },
    { id: 2, name: 'unrelated', open: false, visible: true, parent: null }];
  S.layers[1].fid = 1;
}

describe('layers under cursor', () => {
  it('returns only layers with an opaque pixel at the document coordinate', () => {
    reset(); expect(layerIndicesAt(1, 1)).toEqual([0]);
    expect(layerIndicesAt(2, 2)).toEqual([1]); expect(layerIndicesAt(-1, 1)).toEqual([]);
  });

  it('selects the layer, opens only its folders and centers its row', () => {
    reset(); document.body.innerHTML = '<div id="lay-list"></div>';
    const row = document.createElement('div'); row.dataset.li = '1';
    row.scrollIntoView = vi.fn(); globalThis.requestAnimationFrame = (run) => run();
    const render = vi.fn(() => document.querySelector('#lay-list').append(row));
    S.marked = new Set([0]); S.markedFolders = new Set([2]); S.selFolder = 2;
    selectCanvasLayer(1, render);
    expect(S.cur).toBe(1); expect(S.marked.size).toBe(0);
    expect(S.folders[0].open).toBe(true); expect(S.folders[1].open).toBe(false);
    expect(render).toHaveBeenCalledOnce();
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('puts the layer preview in each canvas picker entry', () => {
    reset(); const preview = document.createElement('canvas'), select = vi.fn();
    const button = layerPickerButton(1, select, preview); button.click();
    expect(button.querySelector('canvas.cctx-thumb')).toBe(preview);
    expect(button.textContent).toBe('hidden'); expect(button.classList.contains('dim')).toBe(true);
    expect(select).toHaveBeenCalledWith(1);
  });
});
