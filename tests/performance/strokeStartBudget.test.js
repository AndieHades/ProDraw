/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { PERFORMANCE_BUDGETS } from '../../src/config/performance.ts';
import { newLayer, S } from '../../src/core/state.ts';
import { brushStamp, continueBrushStroke } from '../../src/systems/draw/brush.js';
import { beginStroke, afterStroke } from '../../src/systems/draw/stroke.js';
import { qsBegin, qsRelease } from '../../src/systems/draw/quickshape.js';

const sample = (x, y) => ({ x, y, pressure: 0.8, tiltX: 0, tiltY: 0, time: 0,
  pointerType: 'pen' });

function prepare(side) {
  S.W = side; S.H = side; S.cur = 0; S.active = [20, 40, 80];
  S.sel = S.selMask = null; S.tile = { on: false }; S.tool = 'pencil';
  S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.pencilSize = 24; S.eraserSize = 24;
  S.brushShape = { pencil: 'round', eraser: 'round' };
  S.brushOpacity = { pencil: 1, eraser: 1 };
  S.undoStack = []; S.redoStack = [];
  S.layers = [newLayer('Paint', side, side)];
}

// Заполняем слой так, как это делает работа: длинными ходами, а не одной точкой.
function paintRows(side, rows) {
  for (let row = 0; row < rows; row++) {
    const y = 20 + row * 26;
    beginStroke(false); qsBegin(20, y);
    brushStamp(20, y, false, true, sample(20.5, y + 0.5));
    for (let x = 40; x < side - 20; x += 20) continueBrushStroke(sample(x, y + 0.5));
    qsRelease(); S.stroke = false; afterStroke();
  }
}

function painted() {
  let count = 0; const grid = S.layers[0].grid;
  for (let y = 0; y < S.H; y++) { const row = grid[y]; if (!row) continue;
    for (let x = 0; x < S.W; x++) if (row[x]) count++; }
  return count;
}

function startCost() {
  const started = performance.now();
  beginStroke(false); qsBegin(30, 30);
  const cost = performance.now() - started;
  qsRelease(); S.stroke = false; afterStroke();
  return cost;
}

describe('stroke start budget', () => {
  // Начало хода копировало весь слой: цена росла вместе с нарисованным, и на
  // большом документе рисование подвисало тем сильнее, чем дольше работаешь.
  it('does not scale with what is already painted', () => {
    prepare(1024);
    const empty = startCost();
    paintRows(1024, 24);
    expect(painted()).toBeGreaterThan(150_000);
    const filled = startCost();
    expect(empty).toBeLessThan(PERFORMANCE_BUDGETS.strokeStartP95Milliseconds);
    expect(filled).toBeLessThan(PERFORMANCE_BUDGETS.strokeStartP95Milliseconds);
  });
});
