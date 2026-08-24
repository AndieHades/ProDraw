import { describe, expect, it } from 'vitest';
import { thumbnailDrawBox } from '../../src/systems/layers/thumbnail.js';

describe('layer thumbnail layout', () => {
  it('fills the square height and preserves the content aspect ratio', () => {
    const tall = thumbnailDrawBox({ minx: 8, miny: 10, maxx: 17, maxy: 29 });
    expect(tall).toMatchObject({ sx: 8, sy: 10, sw: 10, sh: 20,
      dx: 10, dy: 0, dw: 20, dh: 40 });
    expect(tall.dw / tall.dh).toBe(tall.sw / tall.sh);
  });

  it('fits wide content by width without cropping its sides', () => {
    const wide = thumbnailDrawBox({ minx: 2, miny: 3, maxx: 41, maxy: 12 });
    expect(wide).toMatchObject({ sw: 40, sh: 10, dx: 0, dy: 15,
      dw: 40, dh: 10 });
    expect(wide.dw / wide.dh).toBe(wide.sw / wide.sh);
  });
});
