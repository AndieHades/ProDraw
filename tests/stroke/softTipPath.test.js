import { beforeEach, describe, expect, it } from 'vitest';
import { newLayer, S } from '../../src/core/state.ts';
import { brushStamp, continueBrushStroke,
  resetScatter } from '../../src/systems/draw/brush.js';

const sample = (x, y) => ({ x, y, pressure: 1, tiltX: 0, tiltY: 0, time: 0,
  pointerType: 'pen' });

function columns() { const seen = new Set(), grid = S.layers[0].grid;
  for (let y = 0; y < S.H; y++) { const row = grid[y]; if (!row) continue;
    for (let x = 0; x < S.W; x++) if (row[x]) seen.add(x); }
  return seen; }

function alphas() { const values = [], grid = S.layers[0].grid;
  for (let y = 0; y < S.H; y++) { const row = grid[y]; if (!row) continue;
    for (let x = 0; x < S.W; x++) if (row[x]) values.push(row[x][3]); }
  return values; }

describe('hard tip stroke path', () => {
  beforeEach(() => {
    S.W = 64; S.H = 32; S.cur = 0; S.layers = [newLayer('Paint', 64, 32)];
    S.sel = null; S.tile = { on: false }; S.stroke = true;
    S.sym = false; S.symH = false; S.symD1 = false; S.symD2 = false;
    S.pencilSize = 3; S.eraserSize = 3; S.active = [10, 20, 30];
    S.brushShape = { pencil: 'round', eraser: 'round' };
    S.brushOpacity = { pencil: 1, eraser: 1 };
    resetScatter();
  });

  // Раньше отрезок между сэмплами укладывался целочисленным Брезенхемом и
  // распадался на отдельные оттиски при быстром движении.
  it('leaves no gap between two distant samples', () => {
    brushStamp(5, 5, false, true, sample(5.5, 5.5));
    expect(continueBrushStroke(sample(45.5, 12.5))).toBe(true);
    const seen = columns();
    for (let x = 6; x <= 45; x++) expect(seen.has(x)).toBe(true);
  });

  it('antialiases the edge instead of stamping a binary mask', () => {
    brushStamp(20, 16, false, true, sample(20.5, 16.5));
    const values = alphas();
    expect(values).toContain(255);
    expect(values.some((value) => value > 0 && value < 255)).toBe(true);
  });

  it('does not darken where the path overlaps itself', () => {
    S.brushOpacity = { pencil: .5, eraser: .5 };
    brushStamp(10, 16, false, true, sample(10.5, 16.5));
    continueBrushStroke(sample(30.5, 16.5));
    continueBrushStroke(sample(10.5, 16.5));
    expect(Math.max(...alphas())).toBe(128);
  });
});
