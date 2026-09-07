// Scans a typed RGBA region without materialising a cell per pixel. A fully
// transparent sample counts as an absent cell, matching the legacy null cell.

export interface RegionPixels {
  readonly minx: number;
  readonly miny: number;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export function someOpaqueRegionPixel(
  region: RegionPixels, accept: (x: number, y: number) => boolean
): boolean {
  const { data, width, height, minx, miny } = region;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (accept(minx + x, miny + y)) return true;
    }
  }
  return false;
}

export function visitOpaqueRegionPixels(
  region: RegionPixels, visit: (x: number, y: number) => void
): void {
  const { data, width, height, minx, miny } = region;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] !== 0) visit(minx + x, miny + y);
    }
  }
}

// Packs a region into the legacy 0xRRGGBBAA integer layout used by RotSprite.
// Transparent samples stay zero, matching the null cell they came from.
export function packRegionToInt32(
  region: RegionPixels, target: Int32Array, stride: number
): void {
  const { data, width, height, minx, miny } = region;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4, alpha = data[offset + 3] ?? 0;
      if (!alpha) continue;
      target[(miny + y) * stride + minx + x] = (((data[offset] ?? 0) << 24) |
        ((data[offset + 1] ?? 0) << 16) | ((data[offset + 2] ?? 0) << 8) | alpha) >>> 0;
    }
  }
}
