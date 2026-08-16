// Яркость/контраст одной клетки. Чисто.
import { clampRound } from './math.js';
export function bcAdjust(c, bri, f) { const ap = (v) => clampRound(f * (v - 128) + 128 + bri, 0, 255);
  return c.length > 3 ? [ap(c[0]), ap(c[1]), ap(c[2]), c[3]] : [ap(c[0]), ap(c[1]), ap(c[2])]; }

export const contrastFactor = (cc) => (259 * (cc + 255)) / (255 * (259 - cc));
