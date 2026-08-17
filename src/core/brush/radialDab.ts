import rasterConfig from "../../config/brush-raster.json" with { type: "json" };
import type { StrokeSample } from "../../contracts/stroke";

type Visitor = (x: number, y: number, opacity: number) => void;

interface RadialMask {
  readonly key: string;
  readonly x: Int32Array<ArrayBuffer>;
  readonly y: Int32Array<ArrayBuffer>;
  readonly coverage: Float64Array<ArrayBuffer>;
  readonly length: number;
}

let cachedMask: RadialMask | null = null;

function maskKey(sample: StrokeSample, radius: number, edge: number): string {
  const fractionX = sample.x - Math.floor(sample.x);
  const fractionY = sample.y - Math.floor(sample.y);
  return `${radius}:${fractionX}:${fractionY}:${edge}`;
}

function replay(mask: RadialMask, sample: StrokeSample,
  opacity: number, visit: Visitor): void {
  const anchorX = Math.floor(sample.x), anchorY = Math.floor(sample.y);
  for (let index = 0; index < mask.length; index += 1) {
    visit(anchorX + mask.x[index]!, anchorY + mask.y[index]!,
      opacity * mask.coverage[index]!);
  }
}

export function visitRadialDab(
  sample: StrokeSample, radius: number,
  bounds: readonly [number, number, number, number],
  edge: number, opacity: number, visit: Visitor
): void {
  const [minimumX, maximumX, minimumY, maximumY] = bounds;
  const width = maximumX - minimumX + 1;
  const capacity = width * (maximumY - minimumY + 1);
  const cacheable = radius * 2 >= rasterConfig.radialMaskCache.minimumDiameter &&
    capacity <= rasterConfig.radialMaskCache.maximumPixels;
  const key = maskKey(sample, radius, edge);
  if (cacheable && cachedMask?.key === key) {
    replay(cachedMask, sample, opacity, visit); return;
  }
  const offsetsX = cacheable ? new Int32Array(capacity) : null;
  const offsetsY = cacheable ? new Int32Array(capacity) : null;
  const coverages = cacheable ? new Float64Array(capacity) : null;
  const anchorX = Math.floor(sample.x), anchorY = Math.floor(sample.y);
  const normalizedXs = new Float64Array(width);
  for (let x = minimumX; x <= maximumX; x += 1) {
    normalizedXs[x - minimumX] = (x + 0.5 - sample.x) / radius;
  }
  let length = 0;
  for (let y = minimumY; y <= maximumY; y += 1) {
    const normalizedY = (y + 0.5 - sample.y) / radius;
    if (Math.abs(normalizedY) > 1) continue;
    const halfWidth = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY)) * radius;
    const rowMinimum = Math.max(minimumX, Math.floor(sample.x - halfWidth - 1));
    const rowMaximum = Math.min(maximumX, Math.ceil(sample.x + halfWidth + 1));
    for (let x = rowMinimum; x <= rowMaximum; x += 1) {
      const normalizedX = normalizedXs[x - minimumX]!;
      if (Math.abs(normalizedX) > 1) continue;
      const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      if (distance >= 1) continue;
      const coverage = Math.min(1, Math.max(0, (1 - distance) / edge));
      if (offsetsX && offsetsY && coverages) {
        offsetsX[length] = x - anchorX; offsetsY[length] = y - anchorY;
        coverages[length] = coverage; length += 1;
      }
      visit(x, y, opacity * coverage);
    }
  }
  if (offsetsX && offsetsY && coverages) {
    cachedMask = { key, x: offsetsX, y: offsetsY, coverage: coverages, length };
  }
}
