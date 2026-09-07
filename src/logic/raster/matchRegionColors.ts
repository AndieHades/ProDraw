// Finds pixels of a typed RGBA region whose colour equals one of the requested
// colours. Comparison is RGB only, matching the legacy cell comparison, and a
// fully transparent sample counts as an absent cell rather than opaque black.

export interface RegionPixels {
  readonly minx: number;
  readonly miny: number;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type RegionColor = readonly number[];

export function visitRegionColorMatches(
  region: RegionPixels, colors: readonly RegionColor[],
  visit: (x: number, y: number) => void
): void {
  const wanted = colors.filter((color) => color && color.length >= 3);
  if (!wanted.length || !region.width || !region.height) return;
  const { data, width, height, minx, miny } = region;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] === 0) continue;
      const red = data[offset], green = data[offset + 1], blue = data[offset + 2];
      for (const color of wanted) {
        if (color[0] === red && color[1] === green && color[2] === blue) {
          visit(minx + x, miny + y); break;
        }
      }
    }
  }
}
