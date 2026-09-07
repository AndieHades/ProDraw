/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newLayer, S } from '../../src/core/state.ts';
import { cancel, down, forgetCanvasBounds, interrupt,
  move } from '../../src/systems/input/index.js';
import '../../src/systems/draw/tools.js';

const pointer = (clientX, clientY) => ({ clientX, clientY, pointerType: 'pen',
  button: 0, pointerId: 1, pressure: 0.6, tiltX: 0, tiltY: 0, timeStamp: clientX });

function painted() { let count = 0; const grid = S.layers[0].grid;
  for (let y = 0; y < S.H; y++) { const row = grid[y]; if (!row) continue;
    for (let x = 0; x < S.W; x++) if (row[x]) count++; }
  return count; }

const drag = () => { down(pointer(10, 10)); move(pointer(26, 14)); move(pointer(42, 18)); };

describe('stroke interrupted while the pointer is down', () => {
  beforeEach(() => {
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

  // Потеря фокуса окна и потеря захвата указателя раньше стирали нарисованное:
  // ход отменялся, а холст оставался без шага истории.
  it('keeps what is already painted and records one history step', () => {
    drag(); const during = painted();
    expect(during).toBeGreaterThan(0);
    interrupt();
    expect(painted()).toBe(during);
    expect(S.undoStack).toHaveLength(1);
    expect(S.stroke).toBe(false);
  });

  it('ignores an interruption when no gesture is running', () => {
    interrupt();
    expect(S.undoStack).toHaveLength(0);
  });

  // Отменяет ход только сам указатель: pointercancel — отказ ввода, а не
  // переключение окна.
  it('still discards the stroke when the pointer itself cancels', () => {
    drag();
    expect(painted()).toBeGreaterThan(0);
    cancel({ pointerId: 1, pointerType: 'pen' });
    expect(painted()).toBe(0);
    expect(S.undoStack).toHaveLength(0);
  });
});
