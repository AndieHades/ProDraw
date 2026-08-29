import type { SelectionPoint } from "../contracts/selection.ts";
import { isSelectionMask, SelectionMask } from "./selection-mask.ts";
import { symmetrizeSimpleSelectionMask } from "./selection-mask-transform.ts";
import type { SymmetryConfig } from "../contracts/Symmetry.ts";

type Reflection = (point: SelectionPoint) => SelectionPoint;
function reflectionFunctions(config: SymmetryConfig): Reflection[] {
  const output: Reflection[] = [];
  if (config.x) output.push(([x, y]) => [Math.round(2 * config.axisX - x), y]);
  if (config.y) output.push(([x, y]) => [x, Math.round(2 * config.axisY - y)]);
  if (config.d1) output.push(([x, y]) =>
    [Math.round(y - config.diagP), Math.round(x + config.diagP)]);
  if (config.d2) output.push(([x, y]) =>
    [Math.round(config.diagN - y), Math.round(config.diagN - x)]);
  return output;
}
function pointOrbit(x: number, y: number, width: number, height: number,
  reflections: readonly Reflection[]): SelectionPoint[] {
  const queue: SelectionPoint[] = [[x, y]], output: SelectionPoint[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < queue.length && index < 64; index++) {
    const point = queue[index]; if (!point) continue;
    const id = point[1] * width + point[0];
    if (seen.has(id)) continue; seen.add(id); output.push(point);
    for (const reflect of reflections) {
      const next = reflect(point);
      if (next[0] < 0 || next[1] < 0 || next[0] >= width || next[1] >= height) continue;
      const nextId = next[1] * width + next[0]; if (!seen.has(nextId)) queue.push(next);
    }
  }
  return output;
}

export function symmetrizeSelectionMask(mask: unknown,
  config: SymmetryConfig): SelectionMask | null {
  if (!isSelectionMask(mask)) return null;
  const reflections = reflectionFunctions(config);
  if (!reflections.length) return mask.clone();
  const simple = symmetrizeSimpleSelectionMask(mask, config); if (simple) return simple;
  const output = mask.clone(), inverse = mask.inverted();
  if (mask.size <= inverse.size) {
    for (const [x, y] of mask.points())
      for (const point of pointOrbit(x, y, mask.width, mask.height, reflections))
        output.forceSelected(point[0], point[1]);
    return output;
  }
  for (const [x, y] of inverse.points()) {
    const reflected = pointOrbit(x, y, mask.width, mask.height, reflections)
      .some((point) => mask.hasXY(point[0], point[1]));
    if (reflected) output.forceSelected(x, y);
  }
  return output;
}
