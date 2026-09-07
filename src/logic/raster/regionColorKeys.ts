// Flood fill only needs to know whether two pixels share a colour. Packing a
// region into one key per pixel reproduces the legacy cell comparison, which
// looked at red, green and blue and treated two absent cells as equal:
// an absent pixel becomes -1, any other becomes 0xRRGGBB.
import type { RegionPixels } from "./regionScan.ts";

export const EMPTY_COLOR_KEY = -1;

export const colorKeyOf = (color: readonly number[] | null | undefined): number =>
  color ? (((color[0] ?? 0) << 16) | ((color[1] ?? 0) << 8) | (color[2] ?? 0))
    : EMPTY_COLOR_KEY;

export function regionColorKeys(region: RegionPixels): Int32Array {
  const { data, width, height } = region;
  const keys = new Int32Array(width * height).fill(EMPTY_COLOR_KEY);
  for (let index = 0; index < keys.length; index++) {
    const offset = index * 4;
    if (!data[offset + 3]) continue;
    keys[index] = ((data[offset] ?? 0) << 16) |
      ((data[offset + 1] ?? 0) << 8) | (data[offset + 2] ?? 0);
  }
  return keys;
}
