// Packs a floating selection fragment into one RGBA buffer plus its bounds, so
// the caller composites it with a single drawImage instead of one fillRect per
// pixel. Points outside the document are dropped, matching the previous guard.

export interface FloatFragmentPoint {
  readonly x: number;
  readonly y: number;
  readonly cell: readonly number[];
}

export interface FloatFragmentPixels {
  readonly minx: number;
  readonly miny: number;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export function packFloatFragment(
  points: Iterable<FloatFragmentPoint>, documentWidth: number, documentHeight: number
): FloatFragmentPixels | null {
  const inside: FloatFragmentPoint[] = [];
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const point of points) {
    const { x, y } = point;
    if (x < 0 || y < 0 || x >= documentWidth || y >= documentHeight) continue;
    inside.push(point);
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  if (!inside.length) return null;
  const width = maxx - minx + 1, height = maxy - miny + 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (const { x, y, cell } of inside) {
    const offset = ((y - miny) * width + (x - minx)) * 4;
    data[offset] = cell[0] ?? 0;
    data[offset + 1] = cell[1] ?? 0;
    data[offset + 2] = cell[2] ?? 0;
    data[offset + 3] = cell.length > 3 ? cell[3] ?? 255 : 255;
  }
  return { minx, miny, width, height, data };
}
