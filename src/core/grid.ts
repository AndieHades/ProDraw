import { S } from "./state.ts";
import { clampRound } from "../logic/math.ts";

export interface GridSettings {
  w: number; h: number; color: string; opacity: number;
  visible: boolean; preview: boolean; link: boolean;
}

const clampStep = (v: unknown): number => clampRound(Number(v) || 1, 1, 128);
const clampOpacity = (v: unknown): number => clampRound(Number(v) || 70, 5, 100);

export function ensureGrid(): GridSettings {
  const g = (S["grid"] ??= {}) as Partial<GridSettings>;
  g.w = clampStep(g.w || 16);
  g.h = clampStep(g.h || 16);
  g.color ||= "#4aa3ff";
  g.opacity = clampOpacity(g.opacity);
  g.visible = !!g.visible;
  g.preview = !!g.preview;
  g.link = g.link !== false;
  return g as GridSettings;
}

export const gridCellW = (): number => Math.max(1, Math.round(ensureGrid().w) || 16);
export const gridCellH = (): number => Math.max(1, Math.round(ensureGrid().h) || 16);
export const setGridVisible = (on: unknown): GridSettings => {
  const g = ensureGrid();
  g.visible = !!on; g.preview = false;
  return g;
};
