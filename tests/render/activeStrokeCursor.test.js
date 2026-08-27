/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S } from '../../src/core/state.js';
import { drawBrushCursor } from '../../src/systems/render/cursor.js';

describe('simple tool cursor during an active stroke', () => {
  let saved;
  beforeEach(() => { saved = { stroke: S.stroke, hoverPx: S.hoverPx,
    tool: S.tool, pencilSize: S.pencilSize, eraserSize: S.eraserSize,
    pencilShape: S.brushShape.pencil, eraserShape: S.brushShape.eraser };
  });
  afterEach(() => { S.stroke = saved.stroke; S.hoverPx = saved.hoverPx;
    S.tool = saved.tool; S.pencilSize = saved.pencilSize; S.eraserSize = saved.eraserSize;
    S.brushShape.pencil = saved.pencilShape; S.brushShape.eraser = saved.eraserShape;
  });

  it.each(['pencil', 'eraser'])('keeps the %s contour visible during a stroke', (tool) => {
    let arcs = 0;
    const context = { save() {}, restore() {}, beginPath() {}, stroke() {},
      arc() { arcs += 1; } };
    S.tool = tool; S.hoverPx = [2, 2]; S.pencilSize = 3; S.eraserSize = 3;
    S.stroke = true; drawBrushCursor(context, 0, 0, 10);
    expect(arcs).toBe(1);
    S.stroke = false; drawBrushCursor(context, 0, 0, 10);
    expect(arcs).toBe(2);
  });
});
