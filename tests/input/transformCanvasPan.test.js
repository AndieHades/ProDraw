/** @vitest-environment jsdom */
/* global document */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S } from '../../src/core/state.js';
import { registerMode } from '../../src/core/canvas-handlers.ts';
import { down, move, up } from '../../src/systems/input/index.js';

const pointer = (button, x, y) => ({ pointerId: 7, pointerType: 'mouse', button,
  clientX: x, clientY: y, target: document.getElementById('cv') });

describe('canvas pan while Free Transform is active', () => {
  let saved;
  beforeEach(() => {
    saved = { W: S.W, H: S.H, view: { ...S.view }, rotMode: S.rotMode,
      cropMode: S.cropMode, tile: S.tile, hoverPx: S.hoverPx };
    document.body.innerHTML = '<canvas id="cv"></canvas>';
    const canvas = document.getElementById('cv');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn();
    S.W = S.H = 100; S.view = { zoom: 1, ox: 0, oy: 0 };
    S.rotMode = { active: true }; S.cropMode = null; S.tile = { on: false };
  });
  afterEach(() => { S.W = saved.W; S.H = saved.H; S.view = saved.view;
    S.rotMode = saved.rotMode; S.cropMode = saved.cropMode; S.tile = saved.tile;
    S.hoverPx = saved.hoverPx; });

  it.each([0, 2])('pans with mouse button %s outside the transform frame', (button) => {
    const transformDown = vi.fn(); registerMode('transform', {
      hit: () => false, down: transformDown });
    down(pointer(button, 40, 40)); move(pointer(button, 55, 60)); up(pointer(button, 55, 60));
    expect(transformDown).not.toHaveBeenCalled();
    expect(S.view).toMatchObject({ ox: 15, oy: 20 });
    expect(S.rotMode).toEqual({ active: true });
  });

  it('keeps left-button transform control inside the frame', () => {
    const transformDown = vi.fn(); registerMode('transform', {
      hit: () => true, down: transformDown, up: vi.fn() });
    down(pointer(0, 40, 40)); up(pointer(0, 40, 40));
    expect(transformDown).toHaveBeenCalledOnce();
    expect(S.view).toMatchObject({ ox: 0, oy: 0 });
  });
});
