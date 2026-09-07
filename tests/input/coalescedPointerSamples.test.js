/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newLayer, S } from '../../src/core/state.ts';
import { registerTool, toolHandler } from '../../src/core/canvas-handlers.ts';
import { down, forgetCanvasBounds, move, up } from '../../src/systems/input/index.js';

function pointer(clientX, clientY, coalesced) {
  const event = { clientX, clientY, pointerType: 'pen', button: 0, pointerId: 1,
    pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: clientX };
  if (coalesced) event.getCoalescedEvents = () => coalesced;
  return event;
}

describe('pointer samples reaching the tool', () => {
  let seen;
  beforeEach(() => {
    S.W = 64; S.H = 64; S.cur = 0; S.layers = [newLayer('Paint', 64, 64)];
    S.view = { zoom: 1, ox: 0, oy: 0 }; S.tool = 'pencil';
    S.cropMode = S.rotMode = S.sel = S.selMask = null;
    S.tile = { on: false }; S.eyedrop = { active: false };
    document.body.innerHTML = '<canvas id="cv"></canvas>';
    const canvas = document.getElementById('cv');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn();
    seen = [];
    registerTool('pencil', { down: () => undefined,
      move: ({ gx, gy }) => seen.push(`${gx},${gy}`), up: () => undefined });
    forgetCanvasBounds();
  });
  afterEach(() => { up({ pointerId: 1, pointerType: 'pen' }); vi.restoreAllMocks(); });

  it('delivers every coalesced sample in order, not just the last', () => {
    down(pointer(4, 4));
    move(pointer(20, 4, [
      { clientX: 10, clientY: 4, pointerType: 'pen', timeStamp: 10 },
      { clientX: 15, clientY: 4, pointerType: 'pen', timeStamp: 15 },
      { clientX: 20, clientY: 4, pointerType: 'pen', pressure: 0.5, timeStamp: 20 }
    ]));
    expect(seen).toEqual(['10,4', '15,4', '20,4']);
  });

  it('falls back to the single event when coalescing is unavailable', () => {
    down(pointer(4, 4));
    move(pointer(9, 7));
    expect(seen).toEqual(['9,7']);
  });

  it('keeps the final event when the coalesced list stops short of it', () => {
    down(pointer(4, 4));
    move(pointer(30, 4, [{ clientX: 12, clientY: 4, pointerType: 'pen', timeStamp: 12 }]));
    expect(seen).toEqual(['12,4', '30,4']);
  });

  it('does not measure the canvas for every sample of a stroke', () => {
    const canvas = document.getElementById('cv');
    // Один замер на весь штрих, и снова свежий замер после его конца.
    const bounds = vi.fn(() => ({ left: 0, top: 0 }));
    canvas.getBoundingClientRect = bounds;
    down(pointer(4, 4));
    for (let step = 0; step < 20; step++) move(pointer(5 + step, 4));
    expect(bounds).toHaveBeenCalledTimes(1);
    up({ pointerId: 1, pointerType: 'pen' });
    move(pointer(40, 4));
    expect(bounds).toHaveBeenCalledTimes(2);
  });

  it('hands the tool a normalized sample with pen pressure and tilt', () => {
    const samples = [];
    registerTool('pencil', { down: ({ sample }) => samples.push(sample),
      move: ({ sample }) => samples.push(sample), up: () => undefined });
    down(pointer(4, 4));
    move({ clientX: 9, clientY: 7, pointerType: 'pen', pointerId: 1,
      pressure: 0.75, tiltX: 12, tiltY: -3, timeStamp: 90 });
    expect(samples).toHaveLength(2);
    expect(samples[1]).toEqual({ x: 9, y: 7, pressure: 0.75, tiltX: 12,
      tiltY: -3, time: 90, pointerType: 'pen' });
  });

  it('registers the tool handler it replaced for other suites', () => {
    expect(toolHandler('pencil')).toBeTruthy();
  });
});
