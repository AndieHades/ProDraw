import { describe, expect, it } from 'vitest';
import { combineSelectionState, resizeSelectionMask, selectionMaskFromState,
  selectionStateFromMask, shiftSelectionMask, symmetrizeSelectionMask,
  symmetrizeSimpleSelectionMask } from '../../src/logic/mask-ops.js';
import { symmetryAxes } from '../../src/logic/symmetry.js';

describe('compact selection mask', () => {
  it('preserves Set-like membership and boolean operations', () => {
    const rect = { x0: 2, y0: 2, x1: 4, y1: 4 };
    const base = selectionMaskFromState(rect, null, 8, 8);
    expect(base.size).toBe(9); expect(base.has('3,3')).toBe(true);
    expect([...base]).toHaveLength(9);

    const added = combineSelectionState(rect, null, new Set(['0,0']), 'add', 8, 8);
    expect(added.size).toBe(10); expect(added.has('0,0')).toBe(true);
    const subtracted = combineSelectionState(rect, null, new Set(['3,3']), 'subtract', 8, 8);
    expect(subtracted.size).toBe(8); expect(subtracted.has('3,3')).toBe(false);
    const intersected = combineSelectionState(rect, null,
      new Set(['3,3', '7,7']), 'intersect', 8, 8);
    expect([...intersected]).toEqual(['3,3']);
  });

  it('keeps complement masks compact through shift and nearest-neighbour resize', () => {
    const hole = { x0: 2, y0: 2, x1: 3, y1: 3 };
    const inverse = selectionMaskFromState(hole, null, 8, 8).inverted();
    expect(inverse.size).toBe(60); expect(inverse.has('2,2')).toBe(false);
    const shifted = shiftSelectionMask(inverse, 1, 0, 8, 8);
    expect(shifted.has('0,0')).toBe(false); expect(shifted.has('1,0')).toBe(true);
    expect(shifted.has('3,2')).toBe(false);
    const resized = resizeSelectionMask(inverse, { x0: 0, y0: 0, x1: 7, y1: 7 },
      { x0: 0, y0: 0, x1: 3, y1: 3 }, 8, 8);
    expect(resized.size).toBe(15); expect(resized.has('1,1')).toBe(false);
    expect(resized.has('3,3')).toBe(true); expect(selectionStateFromMask(resized).sel)
      .toEqual({ x0: 0, y0: 0, x1: 3, y1: 3 });
  });

  it('symmetrizes a rectangular mask without enumerating its area', () => {
    const mask = selectionMaskFromState({ x0: 1, y0: 2, x1: 2, y1: 4 }, null, 10, 10);
    const cfg = symmetryAxes(10, 10, { x: true, y: true });
    const result = symmetrizeSimpleSelectionMask(mask, cfg);
    expect(result.rects).toHaveLength(4); expect(result.size).toBe(24);
    expect(result.has('8,7')).toBe(true); expect(result.include.size + result.exclude.size).toBe(0);
  });

  it('symmetrizes a dense complement through its small unselected side', () => {
    const inverse = selectionMaskFromState({ x0: 1, y0: 1, x1: 2, y1: 2 },
      null, 8, 8).inverted();
    inverse[Symbol.iterator] = () => { throw new Error('dense string iteration'); };
    const result = symmetrizeSelectionMask(inverse, symmetryAxes(8, 8, { x: true }));
    expect(result.size).toBe(64);
    expect(selectionStateFromMask(result).mask).toBeNull();

    const centered = selectionMaskFromState({ x0: 3, y0: 1, x1: 4, y1: 2 },
      null, 8, 8).inverted();
    const unchanged = symmetrizeSelectionMask(centered, symmetryAxes(8, 8, { x: true }));
    expect(unchanged.size).toBe(60);
    expect(unchanged.has('3,1')).toBe(false);
  });
});
