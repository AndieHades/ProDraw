/** @vitest-environment jsdom */
/* global document */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S } from '../../src/core/state.js';
import { registerMode, registerTool } from '../../src/core/canvas-handlers.ts';
import { setCanvasPanModifierHeld } from '../../src/core/navigationModifiers.ts';
import { down, move, up } from '../../src/systems/input/index.js';

const pointer = (button, x, y, pointerType = 'mouse') => ({ pointerId: 12,
  pointerType, button, clientX: x, clientY: y,
  target: document.getElementById('cv') });

describe('global canvas pan routing', () => {
  let saved;
  beforeEach(() => {
    saved = { W: S.W, H: S.H, view: { ...S.view }, rotMode: S.rotMode,
      cropMode: S.cropMode, tile: S.tile, hoverPx: S.hoverPx, tool: S.tool,
      undoStack: S.undoStack };
    document.body.innerHTML = '<canvas id="cv"></canvas>';
    const canvas = document.getElementById('cv');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn();
    S.W = S.H = 100; S.view = { zoom: 1, ox: 0, oy: 0 };
    S.cropMode = null; S.rotMode = null; S.tile = { on: false };
    S.tool = 'pencil'; S.undoStack = []; setCanvasPanModifierHeld(false);
  });
  afterEach(() => {
    Object.assign(S, saved); setCanvasPanModifierHeld(false);
  });

  it.each([
    ['crop', 0], ['crop', 1], ['crop', 2],
    ['transform', 0], ['transform', 1], ['transform', 2],
  ])('%s pans with mouse button %s outside its hit region', (mode, button) => {
    const state = { active: true }, modeDown = vi.fn();
    if (mode === 'crop') S.cropMode = state; else S.rotMode = state;
    registerMode(mode, { hit: () => false, down: modeDown });
    down(pointer(button, 40, 40));
    move(pointer(button, 55, 60)); up(pointer(button, 55, 60));
    expect(modeDown).not.toHaveBeenCalled();
    expect(S.view).toMatchObject({ ox: 15, oy: 20 });
    expect(mode === 'crop' ? S.cropMode : S.rotMode).toBe(state);
    expect(S.undoStack).toEqual([]);
  });

  it('Space plus primary mouse or pen pans before the active tool', () => {
    const toolDown = vi.fn(); registerTool('pencil', { down: toolDown });
    setCanvasPanModifierHeld(true);
    for (const type of ['mouse', 'pen']) {
      S.view = { zoom: 1, ox: 0, oy: 0 };
      down(pointer(0, 30, 30, type)); move(pointer(0, 38, 42, type)); up(pointer(0, 38, 42, type));
      expect(S.view).toMatchObject({ ox: 8, oy: 12 });
    }
    expect(toolDown).not.toHaveBeenCalled();
  });

  it('keeps ordinary Crop left and right gestures mode-owned', () => {
    const modeDown = vi.fn(); S.cropMode = { active: true };
    registerMode('crop', { hit: () => true, down: modeDown, up: vi.fn() });
    for (const button of [0, 2]) {
      down(pointer(button, 40, 40)); up(pointer(button, 40, 40));
    }
    expect(modeDown.mock.calls.map(([context]) => context.e.button)).toEqual([0, 2]);
    expect(S.view).toMatchObject({ ox: 0, oy: 0 });
  });
});
