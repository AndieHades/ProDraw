export interface AlphaMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array<ArrayBufferLike>;
}

export interface ContourSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Pixel boundary contour preserving outer edges, holes, and separate islands. */
export function alphaContour(mask: AlphaMask, threshold: number): readonly ContourSegment[] {
  const segments: ContourSegment[] = [];
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 &&
    x < mask.width && y < mask.height &&
    (mask.data[y * mask.width + x] ?? 0) >= threshold;
  for (let y = 0; y < mask.height; y += 1) for (let x = 0; x < mask.width; x += 1) {
    if (!on(x, y)) continue;
    if (!on(x, y - 1)) segments.push({ x1: x, y1: y, x2: x + 1, y2: y });
    if (!on(x + 1, y)) segments.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
    if (!on(x, y + 1)) segments.push({ x1: x + 1, y1: y + 1, x2: x, y2: y + 1 });
    if (!on(x - 1, y)) segments.push({ x1: x, y1: y + 1, x2: x, y2: y });
  }
  return segments;
}
