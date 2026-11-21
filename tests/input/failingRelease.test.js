/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S } from '../../src/core/state.ts';
import { registerTool } from '../../src/core/canvas-handlers.ts';
import { down, forgetCanvasBounds, up } from '../../src/systems/input/index.js';

const pointer = { clientX: 4, clientY: 4, pointerType: 'pen', button: 0, pointerId: 1,
  pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: 1 };

describe('tool that throws on release', () => {
  beforeEach(() => {
    S.W = 16; S.H = 16; S.view = { zoom: 1, ox: 0, oy: 0 }; S.tool = 'failing-test-tool';
    S.cropMode = S.rotMode = S.sel = null; S.tile = { on: false };
    document.body.innerHTML = '<canvas id="cv"></canvas>';
    const canvas = document.getElementById('cv');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn();
    forgetCanvasBounds();
  });

  // Раньше флаг жеста оставался поднятым: холст переставал принимать ввод,
  // а приложение выглядело зависшим.
  it('frees the canvas for the next gesture', () => {
    const tool = { down: vi.fn(), up: vi.fn(() => { throw new Error('broken brush'); }) };
    registerTool('failing-test-tool', tool);
    down(pointer);
    expect(() => up(pointer)).toThrow('broken brush');
    down(pointer);
    expect(tool.down).toHaveBeenCalledTimes(2);
  });
});
