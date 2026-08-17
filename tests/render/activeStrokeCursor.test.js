/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S } from '../../src/core/state.js';
import { drawBrushCursor } from '../../src/systems/render/cursor.js';

describe('brush cursor during an active stroke', () => {
  let saved;
  beforeEach(() => { saved = { stroke: S.stroke, hoverPx: S.hoverPx,
    tool: S.tool, size: S.brushes.pencil.size };
  });
  afterEach(() => { S.stroke = saved.stroke; S.hoverPx = saved.hoverPx;
    S.tool = saved.tool; S.brushes.pencil.size = saved.size;
  });

  it('hides the contour until the stroke finishes', () => {
    let lines = 0;
    const context = { save() {}, restore() {}, beginPath() {}, moveTo() {},
      lineTo() { lines += 1; }, stroke() {} };
    S.tool = 'pencil'; S.hoverPx = [2, 2]; S.brushes.pencil.size = 3;
    S.stroke = true; drawBrushCursor(context, 0, 0, 10);
    expect(lines).toBe(0);
    S.stroke = false; drawBrushCursor(context, 0, 0, 10);
    expect(lines).toBeGreaterThan(0);
  });
});
