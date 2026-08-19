// Активная импортированная кисть-штамп — отдельная для карандаша и ластика.
// Запись кончика + токен для кеша маски (меняется при каждой смене кисти).
import { S } from './state.js';
import { BP_SMAX } from '../config/limits.ts';
import { saveBrushPrefs } from './brush-prefs.js';
import { savedBrushControls } from '../logic/brush/savedBrushControls.ts';

let seq = 0;
export function setStampBrush(tool, rec) { S.stampBrush[tool] = rec ? { ...rec, tok: ++seq } : null; }
export function clearStampBrush(tool) { if (tool) S.stampBrush[tool] = null; else S.stampBrush = { pencil: null, eraser: null }; }

export function selectLoadedStampBrush(tool, id, brush, stamp) {
  const changed = S.stampBrush[tool]?.id !== id;
  setStampBrush(tool, { id, name: brush.name, source: 'prodraw-raster',
    shape: 'shape', cov: stamp.coverage, grain: stamp.grain,
    params: stamp.params, smudge: brush.smudge, loaded: brush });
  if (!changed || !S.brushes[tool]) return;
  const controls = savedBrushControls(brush, BP_SMAX);
  S.brushes[tool].size = controls.size;
  S.brushes[tool].op = controls.opacity;
  saveBrushPrefs(S);
}
