/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S } from '../../src/core/state.ts';
import { registerMode, registerTool } from '../../src/core/canvas-handlers.ts';
import { cancel, down, forgetCanvasBounds, move, up } from '../../src/systems/input/index.js';

const pointer = (clientX, clientY) => ({ clientX, clientY, pointerType: 'pen',
  button: 0, pointerId: 1, pressure: 0.6, tiltX: 0, tiltY: 0, timeStamp: clientX });

describe('mode that ends during its own gesture', () => {
  const tool = { down: vi.fn(), move: vi.fn(), up: vi.fn(), cancel: vi.fn() };
  const mode = { hit: () => true, down: vi.fn(), move: vi.fn(), up: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    registerTool('probe', tool); registerMode('crop', mode);
    S.W = S.H = 64; S.view = { zoom: 1, ox: 0, oy: 0 }; S.tool = 'probe';
    S.cropMode = { x0: 0, y0: 0, x1: 63, y1: 63 }; S.rotMode = S.sel = S.selMask = null;
    S.tile = { on: false };
    document.body.innerHTML = '<canvas id="cv"></canvas>';
    const canvas = document.getElementById('cv');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn();
    forgetCanvasBounds();
  });

  it('keeps the rest of the pointer away from the active tool', () => {
    down(pointer(10, 10)); move(pointer(20, 20));
    expect(mode.move).toHaveBeenCalledOnce();
    S.cropMode = null;
    move(pointer(30, 30)); up(pointer(30, 30));
    expect(tool.down).not.toHaveBeenCalled();
    expect(tool.move).not.toHaveBeenCalled();
    expect(tool.up).not.toHaveBeenCalled();
  });

  it('does not cancel a tool stroke that never started', () => {
    down(pointer(10, 10)); S.cropMode = null; cancel(pointer(10, 10));
    expect(tool.cancel).not.toHaveBeenCalled();
  });

  it('gives the next gesture to the tool', () => {
    down(pointer(10, 10)); S.cropMode = null; up(pointer(10, 10));
    down(pointer(12, 12)); move(pointer(16, 16)); up(pointer(16, 16));
    expect(tool.down).toHaveBeenCalledOnce();
    expect(tool.move).toHaveBeenCalledOnce();
    expect(tool.up).toHaveBeenCalledOnce();
  });
});
