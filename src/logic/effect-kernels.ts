// Bounded typed-array kernels for layer effects. Coordinates are local to mask.
export type EffectMask = Uint8Array | ArrayLike<number>;
export type EffectPixel = [x: number, y: number, alpha: number];
export interface EffectParams {
  readonly size: number;
  readonly intensity: number;
  readonly dx?: number;
  readonly dy?: number;
}

const N8: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1],
  [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const N4: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const inside = (x: number, y: number, width: number, height: number): boolean =>
  x >= 0 && y >= 0 && x < width && y < height;

export function flatStrokePixels(mask: EffectMask, width: number, height: number,
  size: number): EffectPixel[] {
  const limit = Math.max(1, size | 0), distance = new Int32Array(mask.length);
  distance.fill(-1);
  const queue = new Int32Array(mask.length); let head = 0, tail = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    distance[i] = 0; queue[tail++] = i;
  }
  while (head < tail) {
    const index = queue[head++] ?? 0, depth = distance[index] ?? 0;
    if (depth >= limit) continue;
    const x = index % width, y = Math.floor(index / width);
    for (const [dx, dy] of N8) {
      const nx = x + dx, ny = y + dy;
      if (!inside(nx, ny, width, height)) continue;
      const next = ny * width + nx;
      if ((distance[next] ?? -1) >= 0) continue;
      distance[next] = depth + 1; queue[tail++] = next;
    }
  }
  const pixels: EffectPixel[] = [];
  for (let i = 0; i < distance.length; i++) if (!mask[i] && (distance[i] ?? 0) > 0) {
    pixels.push([i % width, Math.floor(i / width), 255]);
  }
  return pixels;
}

export function flatGlowField(mask: EffectMask, width: number,
  height: number): Float32Array {
  const distance = new Float32Array(mask.length), infinity = 1e9;
  for (let i = 0; i < mask.length; i++) distance[i] = mask[i] ? 0 : infinity;
  const update = (at: number, from: number, cost: number): void => {
    const source = (distance[from] ?? infinity) + cost;
    if (source < (distance[at] ?? infinity)) distance[at] = source;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (x > 0) update(i, i - 1, 3);
    if (y > 0) update(i, i - width, 3);
    if (x > 0 && y > 0) update(i, i - width - 1, 4);
    if (x < width - 1 && y > 0) update(i, i - width + 1, 4);
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    if (x < width - 1) update(i, i + 1, 3);
    if (y < height - 1) update(i, i + width, 3);
    if (x < width - 1 && y < height - 1) update(i, i + width + 1, 4);
    if (x > 0 && y < height - 1) update(i, i + width - 1, 4);
  }
  return distance;
}

export function flatGlowPixels(mask: EffectMask, width: number, height: number,
  range: number, intensity: number): EffectPixel[] {
  const distance = flatGlowField(mask, width, height), pixels: EffectPixel[] = [];
  for (let i = 0; i < distance.length; i++) {
    const value = (distance[i] ?? 0) / 3;
    if (value <= 0 || value > range) continue;
    const alpha = Math.round(255 * intensity * Math.pow(1 - value / range, 1.5));
    if (alpha > 0) pixels.push([i % width, Math.floor(i / width), alpha]);
  }
  return pixels;
}

export function flatDropShadowPixels(mask: EffectMask, width: number,
  height: number, params: EffectParams): EffectPixel[] {
  const shifted = new Uint8Array(mask.length);
  const dx = (params.dx ?? 0) | 0, dy = (params.dy ?? 0) | 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    const x = i % width + dx, y = Math.floor(i / width) + dy;
    if (inside(x, y, width, height)) shifted[y * width + x] = 1;
  }
  const alpha = Math.round(255 * params.intensity), pixels: EffectPixel[] = [];
  for (let i = 0; i < shifted.length; i++) if (shifted[i]) {
    pixels.push([i % width, Math.floor(i / width), alpha]);
  }
  if (params.size > 0) pixels.push(...flatGlowPixels(
    shifted, width, height, params.size | 0, params.intensity));
  return pixels;
}

export function flatInnerShadowPixels(mask: EffectMask, width: number,
  height: number, params: EffectParams): EffectPixel[] {
  const size = Math.max(1, params.size | 0), ux = Math.sign((params.dx ?? 0) | 0);
  const uy = Math.sign((params.dy ?? 0) | 0), distance = new Int32Array(mask.length);
  distance.fill(-1);
  const queue = new Int32Array(mask.length); let head = 0, tail = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    const x = i % width, y = Math.floor(i / width); let seed = false;
    if (ux || uy) {
      const sx = x - ux, sy = y - uy;
      seed = !inside(sx, sy, width, height) || !mask[sy * width + sx];
    } else for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (!inside(nx, ny, width, height) || !mask[ny * width + nx]) { seed = true; break; }
    }
    if (seed) { distance[i] = 0; queue[tail++] = i; }
  }
  while (head < tail) {
    const index = queue[head++] ?? 0, depth = distance[index] ?? 0;
    if (depth >= size) continue;
    const x = index % width, y = Math.floor(index / width);
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (!inside(nx, ny, width, height)) continue;
      const next = ny * width + nx;
      if (mask[next] && (distance[next] ?? -1) < 0) {
        distance[next] = depth + 1; queue[tail++] = next;
      }
    }
  }
  const pixels: EffectPixel[] = [];
  for (let i = 0; i < distance.length; i++) {
    const depth = distance[i] ?? -1; if (depth < 0) continue;
    const alpha = Math.round(255 * params.intensity * (1 - depth / size));
    if (alpha > 0) pixels.push([i % width, Math.floor(i / width), alpha]);
  }
  return pixels;
}

export const FLAT_EFFECT_PIXELS: Readonly<Record<string,
  (mask: EffectMask, width: number, height: number,
    params: EffectParams) => EffectPixel[]>> = {
  stroke: (mask, width, height, params) =>
    flatStrokePixels(mask, width, height, params.size),
  glow: (mask, width, height, params) => flatGlowPixels(
    mask, width, height, Math.max(1, params.size | 0), params.intensity),
  dropShadow: flatDropShadowPixels,
  innerShadow: flatInnerShadowPixels,
};
