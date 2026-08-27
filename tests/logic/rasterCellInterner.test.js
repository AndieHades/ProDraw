import { describe, expect, it } from 'vitest';
import { createRasterCellInterner } from
  '../../src/logic/raster-cell-interner.js';

describe('raster cell interner', () => {
  it('shares equal colour values without merging different alpha or shapes', () => {
    const cells = createRasterCellInterner();
    const first = cells.rgba(10, 20, 30, 40);
    expect(cells.copy([10, 20, 30, 40])).toBe(first);
    expect(cells.rgba(10, 20, 30, 41)).not.toBe(first);
    expect(cells.copy([10, 20, 30])).not.toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });
});
