/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newLayer, S } from '../../src/core/state.ts';
import { down, forgetCanvasBounds, move, up } from '../../src/systems/input/index.js';
import '../../src/systems/draw/tools.js';

const brushFault = vi.hoisted(() => ({ on: false }));
vi.mock('../../src/systems/draw/brush.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, endBrushStroke: () => {
    if (brushFault.on) throw new Error('broken brush');
    actual.endBrushStroke(); } };
});

const pointer = (clientX, clientY) => ({ clientX, clientY, pointerType: 'pen',
  button: 0, pointerId: 1, pressure: 0.6, tiltX: 0, tiltY: 0, timeStamp: clientX });
const stroke = (y) => { down(pointer(10, y)); move(pointer(30, y + 4)); return () => up(pointer(40, y + 6)); };

describe('brush that fails while finishing a stroke', () => {
  beforeEach(() => {
    brushFault.on = false;
    S.W = 64; S.H = 64; S.cur = 0; S.layers = [newLayer('Paint', 64, 64)];
    S.view = { zoom: 1, ox: 0, oy: 0 }; S.tool = 'pencil'; S.stroke = false;
    S.cropMode = S.rotMode = S.sel = S.selMask = null;
    S.tile = { on: false }; S.eyedrop = { active: false };
    S.pencilSize = 9; S.eraserSize = 9; S.active = [10, 20, 30];
    S.brushShape = { pencil: 'round', eraser: 'round' };
    S.brushOpacity = { pencil: 1, eraser: 1 };
    S.undoStack = []; S.redoStack = [];
    document.body.innerHTML = '<canvas id="cv"></canvas>';
    const canvas = document.getElementById('cv');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn();
    forgetCanvasBounds();
  });

  // Поднятый S.stroke раньше блокировал сохранение, и окно не закрывалось.
  it('closes the stroke, keeps what was drawn and lets the next stroke run', () => {
    brushFault.on = true;
    expect(stroke(10)).toThrow('broken brush');
    expect(S.stroke).toBe(false);
    expect(S.undoStack).toHaveLength(1);
    brushFault.on = false;
    stroke(30)();
    expect(S.stroke).toBe(false);
    expect(S.undoStack).toHaveLength(2);
  });
});
