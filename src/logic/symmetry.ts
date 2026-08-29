import type { SelectionPoint } from "../contracts/selection.ts";
import { isSelectionMask, SelectionMask } from "./selection-mask.ts";
import { symmetrizeSelectionMask } from "./selection-symmetry.ts";
import type { SymmetryConfig, SymmetryOptions } from "../contracts/Symmetry.ts";
export type { SymmetryConfig, SymmetryOptions } from "../contracts/Symmetry.ts";
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const inBounds = (x: number, y: number, width: number, height: number): boolean =>
  x >= 0 && y >= 0 && x < width && y < height;
const parseKey = (key: string): SelectionPoint => {
  const separator = key.indexOf(",");
  return [Number(key.slice(0, separator)), Number(key.slice(separator + 1))];
};

export const centerSymmetryAxes = (width: number, height: number): Omit<SymmetryConfig,
  "x" | "y" | "d1" | "d2"> => ({ axisX: (width - 1) / 2,
  axisY: (height - 1) / 2, diagP: (height - width) / 2,
  diagN: (width + height - 2) / 2 });
export function symmetryAxes(width: number, height: number,
  options: SymmetryOptions = {}): SymmetryConfig {
  const center = centerSymmetryAxes(width, height);
  return { x: !!options.x, y: !!options.y, d1: !!options.d1, d2: !!options.d2,
    axisX: finite(options.axisX) ? options.axisX : center.axisX,
    axisY: finite(options.axisY) ? options.axisY : center.axisY,
    diagP: finite(options.diagP) ? options.diagP : center.diagP,
    diagN: finite(options.diagN) ? options.diagN : center.diagN };
}

type Reflection = (point: SelectionPoint) => SelectionPoint;
export function mirrorPoints(x: number, y: number, width: number, height: number,
  reflectX: boolean, reflectY: boolean,
  options: SymmetryOptions | null = null): SelectionPoint[] {
  const config = symmetryAxes(width, height, { ...(options ?? {}),
    x: reflectX || !!options?.x, y: reflectY || !!options?.y });
  const reflections: Reflection[] = [];
  if (config.x) reflections.push(([px, py]) => [Math.round(2 * config.axisX - px), py]);
  if (config.y) reflections.push(([px, py]) => [px, Math.round(2 * config.axisY - py)]);
  if (config.d1) reflections.push(([px, py]) =>
    [Math.round(py - config.diagP), Math.round(px + config.diagP)]);
  if (config.d2) reflections.push(([px, py]) =>
    [Math.round(config.diagN - py), Math.round(config.diagN - px)]);
  if (!reflections.length) return [[x, y]];
  const output: SelectionPoint[] = [], seen = new Set<string>();
  const queue: SelectionPoint[] = [[x, y]];
  for (let index = 0; index < queue.length && index < 64; index++) {
    const point = queue[index]; if (!point) continue;
    const key = `${point[0]},${point[1]}`; if (seen.has(key)) continue;
    seen.add(key); if (inBounds(point[0], point[1], width, height)) output.push(point);
    for (const reflect of reflections) {
      const next = reflect(point), nextKey = `${next[0]},${next[1]}`;
      if (!seen.has(nextKey) && inBounds(next[0], next[1], width, height)) queue.push(next);
    }
  }
  return output;
}

export function expandMask(mask: SelectionMask | Iterable<string>, width: number,
  height: number, reflectX: boolean, reflectY: boolean,
  options: SymmetryOptions | null = null): SelectionMask | Set<string> {
  const config = { ...(options ?? {}), x: reflectX || !!options?.x,
    y: reflectY || !!options?.y };
  const active = config.x || config.y || config.d1 || config.d2;
  if (isSelectionMask(mask)) return active ?
    (symmetrizeSelectionMask(mask, symmetryAxes(width, height, config)) ?? mask.clone()) :
    mask.clone();
  if (!active) return new Set(mask);
  const output = new Set<string>();
  for (const key of mask) {
    const [x, y] = parseKey(key);
    for (const [nextX, nextY] of mirrorPoints(x, y, width, height, reflectX,
      reflectY, options)) output.add(`${nextX},${nextY}`);
  }
  return output;
}
export function mirrorDeltas(dx: number, dy: number, reflectX: boolean,
  reflectY: boolean): SelectionPoint[] {
  const output: SelectionPoint[] = [[dx, dy]];
  if (reflectX) output.push([-dx, dy]); if (reflectY) output.push([dx, -dy]);
  if (reflectX && reflectY) output.push([-dx, -dy]); return output;
}
