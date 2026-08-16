import type { BrushPreset, CoverageMap, LoadedBrush } from "../../contracts/brush";

function shapeOf(brush: BrushPreset | LoadedBrush): CoverageMap | null {
  return "shapeMap" in brush ? brush.shapeMap : null;
}

function bilinear(map: CoverageMap, x: number, y: number): number {
  const mapX = Math.max(0, Math.min(map.width - 1, x * (map.width - 1)));
  const mapY = Math.max(0, Math.min(map.height - 1, y * (map.height - 1)));
  const left = Math.floor(mapX);
  const top = Math.floor(mapY);
  const right = Math.min(map.width - 1, left + 1);
  const bottom = Math.min(map.height - 1, top + 1);
  const fractionX = mapX - left;
  const fractionY = mapY - top;
  const value = (px: number, py: number) => map.data[py * map.width + px] ?? 0;
  const topValue = value(left, top) * (1 - fractionX) + value(right, top) * fractionX;
  const bottomValue = value(left, bottom) * (1 - fractionX) +
    value(right, bottom) * fractionX;
  return (topValue * (1 - fractionY) + bottomValue * fractionY) / 255;
}

export function brushTipCoverage(
  brush: BrushPreset | LoadedBrush,
  normalizedX: number,
  normalizedY: number
): number {
  if (Math.abs(normalizedX) > 1 || Math.abs(normalizedY) > 1) return 0;
  const shape = shapeOf(brush);
  if (shape) return bilinear(shape, (normalizedX + 1) / 2, (normalizedY + 1) / 2);
  const distance = Math.hypot(normalizedX, normalizedY);
  if (distance >= 1) return 0;
  const edge = Math.max(0.001, 1 - brush.shape.hardness);
  return Math.min(1, Math.max(0, (1 - distance) / edge));
}

export function brushTexture(
  brush: BrushPreset | LoadedBrush,
  x: number,
  y: number
): number {
  if (brush.grain.strength <= 0) return 1;
  const grain = "grainMap" in brush ? brush.grainMap : null;
  const procedural = ((x * 73856093) ^ (y * 19349663) ^ brush.id.length * 83492791) >>> 0;
  const sample = grain
    ? (grain.data[((y % grain.height + grain.height) % grain.height) * grain.width +
      ((x % grain.width + grain.width) % grain.width)] ?? 0) / 255
    : (procedural % 997) / 996;
  return 1 - brush.grain.strength + sample * brush.grain.strength;
}
