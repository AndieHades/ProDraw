// Compatibility wrapper around the shared typed-array stroke kernel.
import { flatStrokePixels } from './effect-kernels.js';

export function outlineRings(grid, W, H, size) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x]) mask[y * W + x] = 1;
  return flatStrokePixels(mask, W, H, size).map(([x, y]) => [x, y]);
}
