import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newLayer, S } from '../../src/core/state.js';
import { brushStamp } from '../../src/systems/draw/brush.js';

function reset(shape, opacity = 1) {
  S.W = 9; S.H = 9; S.cur = 0; S.layers = [newLayer('Asset', 9, 9)];
  S.sel = null; S.tile = { on: false }; S.sym = false; S.symH = false;
  S.symD1 = false; S.symD2 = false; S.pencilSize = 5; S.eraserSize = 5;
  S.brushShape = { pencil: shape, eraser: shape };
  S.brushOpacity = { pencil: opacity, eraser: opacity };
}

describe('simple brush runtime', () => {
  it('starts the production entrypoint without the external brush bridge', () => {
    const entry = readFileSync('src/legacy-entry.js', 'utf8');
    expect(entry).toContain('./app.js');
    expect(entry).not.toContain('mountCompactBrushLibrary');
    expect(entry).not.toContain('BrushLibrary');
  });

  it('uses a hard round or square footprint with preserved opacity', () => {
    reset('round', .5); brushStamp(4, 4, false);
    expect(S.layers[0].grid[2][2]).toBeNull();
    expect(S.layers[0].grid[4][4][3]).toBe(128);
    reset('square'); brushStamp(4, 4, false);
    expect(S.layers[0].grid[2][2][3]).toBe(255);
  });

  it('erases alpha with the same hard selected footprint', () => {
    reset('round');
    for (const row of S.layers[0].grid) row.fill([1, 2, 3, 255]);
    brushStamp(4, 4, true);
    expect(S.layers[0].grid[4][4]).toBeNull();
    expect(S.layers[0].grid[2][2]).toEqual([1, 2, 3, 255]);
  });
});
