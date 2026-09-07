// Selection Path: строит временный контур (Continuous/Segment). Точки — в
// координатах сетки. Ничего не знает о масках и операциях выделения — только
// геометрия пути и близость к стартовой точке (для замыкания/подсветки).
import { S } from "../../core/state.ts";
import * as bus from "../../core/bus.ts";
import { LASSO_CLOSE_PX } from "../../config/lasso.ts";

export type PathPoint = [number, number];
interface LassoPath { pts: PathPoint[]; near: boolean }

const path = (): LassoPath | null => (S["lassoPath"] as LassoPath | null) ?? null;
const last = (points: readonly PathPoint[]): PathPoint | undefined => points[points.length - 1];
// порог замыкания в клетках: экранные px → клетки по текущему зуму (минимум одна клетка)
const closeDist = (): number => {
  const view = S["view"] as { zoom?: number } | undefined;
  return Math.max(1, LASSO_CLOSE_PX / (view?.zoom || 1));
};

export const pathActive = (): boolean => path() !== null;
export const getPoints = (): PathPoint[] | null => path()?.pts ?? null;
export const nearStart = (): boolean => path()?.near === true;

export function beginPath(x: number, y: number): void {
  S["lassoPath"] = { pts: [[x, y]], near: false } satisfies LassoPath;
  bus.emit("render");
}

export function addPoint(x: number, y: number): void {
  const active = path(); if (!active) return;
  const previous = last(active.pts);
  if (!previous || previous[0] !== x || previous[1] !== y) active.pts.push([x, y]);
  const start = active.pts[0];
  active.near = !!start && active.pts.length > 2 &&
    Math.hypot(x - start[0], y - start[1]) <= closeDist();
  bus.emit("render");
}

export function resetPath(): void {
  if (!path()) return;
  S["lassoPath"] = null; bus.emit("render");
}
