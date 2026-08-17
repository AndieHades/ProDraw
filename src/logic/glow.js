// Compatibility wrappers around the shared typed-array glow kernel.
import { flatGlowField, flatGlowPixels } from './effect-kernels.js';

const flatten = (grid, W, H) => { const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x]) mask[y * W + x] = 1;
  return mask; };

export function glowField(grid, W, H) { return flatGlowField(flatten(grid, W, H), W, H); }
export function computeGlow(grid, W, H, range, intensity) {
  return flatGlowPixels(flatten(grid, W, H), W, H, range, intensity);
}
