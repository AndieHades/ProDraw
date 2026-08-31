import { packedRgbaState } from "./PackedRgbaGrid.ts";

export function copyPackedRgbaTile(
  value: unknown,
  tileX: number,
  tileY: number,
  tileSize: number,
): Uint8ClampedArray | null | undefined {
  const state = packedRgbaState(value); if (!state) return undefined;
  const bytes = new Uint8ClampedArray(tileSize * tileSize * 4);
  const left = tileX * tileSize, top = tileY * tileSize;
  const width = Math.max(0, Math.min(tileSize, state.width - left));
  const height = Math.max(0, Math.min(tileSize, state.height - top));
  for (let row = 0; row < height; row++)
    state.copySpan(top + row, left, width, bytes, row * tileSize * 4);
  return bytes.some((value, index) => index % 4 === 3 && value > 0) ? bytes : null;
}

export function replacePackedRgbaTile(
  value: unknown,
  tileX: number,
  tileY: number,
  tileSize: number,
  bytes: Uint8ClampedArray | null,
): boolean {
  const state = packedRgbaState(value); if (!state) return false;
  const left = tileX * tileSize, top = tileY * tileSize;
  const width = Math.max(0, Math.min(tileSize, state.width - left));
  const height = Math.max(0, Math.min(tileSize, state.height - top));
  const empty = new Uint8ClampedArray(width * 4);
  for (let row = 0; row < height; row++) {
    const offset = row * tileSize * 4;
    const span = bytes ? bytes.subarray(offset, offset + width * 4) : empty;
    state.replaceSpan(top + row, left, span);
  }
  return true;
}
