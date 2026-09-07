/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { newLayer, S } from '../../src/core/state.ts';
import { brushStamp, continueBrushStroke } from '../../src/systems/draw/brush.js';
import { beginStroke, afterStroke } from '../../src/systems/draw/stroke.js';
import { qsBegin, qsMove, qsRelease } from '../../src/systems/draw/quickshape.js';
import { QUICKSHAPE } from '../../src/config/quickshape.ts';

const sample = (x, y) => ({ x, y, pressure: 0.8, tiltX: 0, tiltY: 0, time: 0,
  pointerType: 'pen' });

function painted() {
  let count = 0; const grid = S.layers[0].grid;
  for (let y = 0; y < S.H; y++) { const row = grid[y]; if (!row) continue;
    for (let x = 0; x < S.W; x++) if (row[x]) count++; }
  return count;
}

describe('QuickShape over a raster stroke', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    S.W = 128; S.H = 128; S.cur = 0; S.active = [10, 20, 30];
    S.sel = S.selMask = null; S.tile = { on: false }; S.tool = 'pencil';
    S.sym = S.symH = S.symD1 = S.symD2 = false;
    S.pencilSize = 3; S.eraserSize = 3;
    S.brushShape = { pencil: 'round', eraser: 'round' };
    S.brushOpacity = { pencil: 1, eraser: 1 };
    S.undoStack = []; S.redoStack = []; S.qsShape = null;
    S.layers = [newLayer('Paint', 128, 128)];
  });
  afterEach(() => { qsRelease(); vi.useRealTimers(); });

  // Снимок сетки на старте хода убран; форму по-прежнему узнаёт удержание, а
  // сырой штрих снимает тайловая правка.
  it('replaces the raw stroke with the held shape', () => {
    beginStroke(false); qsBegin(10, 10);
    brushStamp(10, 10, false, true, sample(10.5, 10.5));
    for (let x = 20; x <= 100; x += 10) {
      qsMove(x, 10); continueBrushStroke(sample(x, 10.5));
    }
    expect(painted()).toBeGreaterThan(0);
    vi.advanceTimersByTime(QUICKSHAPE.holdMs + 20);
    expect(S.qsShape).not.toBeNull();
    expect(painted()).toBe(0); // сырой штрих убран, показывается превью формы
    expect(qsRelease()).toBe(true);
    expect(painted()).toBeGreaterThan(0); // ровная форма попала в слой
    S.stroke = false; afterStroke();
  });

  it('keeps the freehand stroke when nothing is held', () => {
    beginStroke(false); qsBegin(10, 60);
    brushStamp(10, 60, false, true, sample(10.5, 60.5));
    for (let x = 20; x <= 60; x += 10) {
      qsMove(x, 60 + x % 7); continueBrushStroke(sample(x, 60.5 + x % 7));
    }
    const drawn = painted();
    expect(qsRelease()).toBe(false);
    expect(painted()).toBe(drawn);
    S.stroke = false; afterStroke();
  });
});
