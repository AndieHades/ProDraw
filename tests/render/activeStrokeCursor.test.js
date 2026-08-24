/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S } from '../../src/core/state.js';
import { drawBrushCursor } from '../../src/systems/render/cursor.js';

describe('simple tool cursor during an active stroke', () => {
  let saved;
  beforeEach(() => { saved = { stroke: S.stroke, hoverPx: S.hoverPx,
    tool: S.tool, size: S.pencilSize, shape: S.brushShape.pencil };
  });
  afterEach(() => { S.stroke = saved.stroke; S.hoverPx = saved.hoverPx;
    S.tool = saved.tool; S.pencilSize = saved.size; S.brushShape.pencil = saved.shape;
  });

  it('hides the contour until the stroke finishes', () => {
    let arcs = 0;
    const context = { save() {}, restore() {}, beginPath() {}, stroke() {},
      arc() { arcs += 1; } };
    S.tool = 'pencil'; S.hoverPx = [2, 2]; S.pencilSize = 3;
    S.stroke = true; drawBrushCursor(context, 0, 0, 10);
    expect(arcs).toBe(0);
    S.stroke = false; drawBrushCursor(context, 0, 0, 10);
    expect(arcs).toBe(1);
  });
});
