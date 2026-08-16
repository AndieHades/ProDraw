import { S } from './state.js';
import { clampRound } from '../logic/math.js';

const clampStep = (v) => clampRound(+v || 1, 1, 128);
const clampOpacity = (v) => clampRound(+v || 70, 5, 100);

export function ensureGrid() {
  S.grid ||= {};
  S.grid.w = clampStep(S.grid.w || 16);
  S.grid.h = clampStep(S.grid.h || 16);
  S.grid.color ||= '#4aa3ff';
  S.grid.opacity = clampOpacity(S.grid.opacity);
  S.grid.visible = !!S.grid.visible;
  S.grid.preview = !!S.grid.preview;
  S.grid.link = S.grid.link !== false;
  return S.grid;
}

export const gridCellW = () => Math.max(1, Math.round(ensureGrid().w) || 16);
export const gridCellH = () => Math.max(1, Math.round(ensureGrid().h) || 16);
export const setGridVisible = (on) => {
  const g = ensureGrid();
  g.visible = !!on; g.preview = false;
  return g;
};
