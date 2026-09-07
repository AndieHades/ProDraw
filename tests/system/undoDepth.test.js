/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { newLayer, S } from '../../src/core/state.ts';
import { doUndo } from '../../src/core/history.js';
import { brushStamp } from '../../src/systems/draw/brush.js';
import { afterStroke, beginStroke } from '../../src/systems/draw/stroke.js';

function prepare(width, height) {
  S.W = width; S.H = height; S.cur = 0; S.active = [9, 8, 7];
  S.layers = [newLayer('Paint', width, height)];
  S.undoStack = []; S.redoStack = []; S.tool = 'pencil'; S.pencilSize = 4;
  S.sel = S.selMask = S.selFloat = S.rotMode = null; S.tile = { on: false };
  S.bgSel = false; S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.brushShape = { pencil: 'round', eraser: 'round' };
  S.brushOpacity = { pencil: 1, eraser: 1 };
}

const stroke = (x, y) => { beginStroke(); brushStamp(x, y, false); afterStroke(); };

describe('undo depth on a full size document', () => {
  beforeEach(() => prepare(1920, 1080));

  it('keeps every stroke of a long session instead of an area based cap', () => {
    for (let index = 0; index < 60; index++) stroke(20 + index * 8, 40);
    expect(S.undoStack).toHaveLength(60);
  });

  it('undoes the same number of strokes it recorded', () => {
    for (let index = 0; index < 60; index++) stroke(20 + index * 8, 40);
    for (let index = 0; index < 60; index++) doUndo();
    expect(S.undoStack).toHaveLength(0);
    expect(S.layers[0].grid[40]?.[20]).toBeFalsy();
  });

  it('does not grow past the retained entry ceiling', () => {
    // Distinct positions: repainting the same pixels changes nothing and
    // therefore records nothing.
    for (let index = 0; index < 140; index++) stroke(20 + index * 12, 40);
    expect(S.undoStack).toHaveLength(100);
  });
});
