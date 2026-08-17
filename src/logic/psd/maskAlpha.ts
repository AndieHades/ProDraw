import type { PsdImportMask } from "../../contracts/psdImport.ts";

interface Bounds { minx: number; miny: number; maxx: number; maxy: number }
interface LayerBounds { left: number; top: number }

const sample = (mask: PsdImportMask, x: number, y: number,
  layer: LayerBounds | undefined, dx: number, dy: number): number => {
  const left = mask.left + dx + (mask.relativeToLayer ? layer?.left ?? 0 : 0);
  const top = mask.top + dy + (mask.relativeToLayer ? layer?.top ?? 0 : 0);
  const mx = x - left, my = y - top;
  if (mx < 0 || my < 0 || mx >= mask.width || my >= mask.height) return mask.defaultAlpha;
  return mask.alpha[my * mask.width + mx] ?? mask.defaultAlpha;
};

function blurHorizontal(source: Uint8ClampedArray, width: number, height: number,
  radius: number): Uint8ClampedArray {
  if (!radius) return source.slice();
  const output = new Uint8ClampedArray(source.length), span = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += source[y * width +
      Math.max(0, Math.min(width - 1, x))]!;
    for (let x = 0; x < width; x++) {
      output[y * width + x] = Math.round(sum / span);
      sum -= source[y * width + Math.max(0, x - radius)]!;
      sum += source[y * width + Math.min(width - 1, x + radius + 1)]!;
    }
  }
  return output;
}

function blur(source: Uint8ClampedArray, width: number, height: number,
  radius: number): Uint8ClampedArray {
  if (!radius) return source;
  const transposed = new Uint8ClampedArray(source.length);
  const horizontal = blurHorizontal(source, width, height, radius);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    transposed[x * height + y] = horizontal[y * width + x]!;
  }
  const vertical = blurHorizontal(transposed, height, width, radius);
  const output = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    output[y * width + x] = vertical[x * height + y]!;
  }
  return output;
}

export function psdMaskField(mask: PsdImportMask, bounds: Bounds,
  layer: LayerBounds | undefined, dx = 0, dy = 0): Uint8ClampedArray {
  const width = bounds.maxx - bounds.minx + 1, height = bounds.maxy - bounds.miny + 1;
  const radius = Math.min(64, Math.ceil(mask.feather));
  const paddedWidth = width + radius * 2, paddedHeight = height + radius * 2;
  const raw = new Uint8ClampedArray(paddedWidth * paddedHeight);
  for (let y = 0; y < paddedHeight; y++) for (let x = 0; x < paddedWidth; x++) {
    raw[y * paddedWidth + x] = sample(mask, bounds.minx + x - radius,
      bounds.miny + y - radius, layer, dx, dy);
  }
  const field = radius ? blur(blur(raw, paddedWidth, paddedHeight, radius),
    paddedWidth, paddedHeight, radius) : raw;
  const output = new Uint8ClampedArray(width * height), density = mask.density;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = field[(y + radius) * paddedWidth + x + radius]!;
    output[y * width + x] = Math.round(255 - (255 - value) * density);
  }
  return output;
}
