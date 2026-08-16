// Последние пользовательские настройки кисти, общие между сессиями.
import { BP_SMAX } from '../config/limits.js';
import { clamp01 as norm01, clampRound } from '../logic/math.js';

export const BRUSH_PREFS_STORE = 'brushSettings';

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);
const clamp01 = (v) => norm01(Number(v));
const clampSize = (v) => clampRound(Number(v), 1, BP_SMAX);
const finite = (v) => v !== null && v !== '' && Number.isFinite(Number(v));
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);

function savedBrush(saved, key) { return (saved && saved[key]) || (saved && saved.brushes && saved.brushes[key]) || {}; }
function savedFlag(saved, key) { return saved ? (saved[key] ?? (saved.flags && saved.flags[key])) : undefined; }
function brush(fallback, saved) {
  return {
    size: finite(saved.size) ? clampSize(saved.size) : fallback.size,
    op: finite(saved.op) ? clamp01(saved.op) : fallback.op,
  };
}

export function loadBrushPrefs(defaultBrushes, defaultFlags) {
  const fallback = {
    brushes: { pencil: { ...defaultBrushes.pencil }, eraser: { ...defaultBrushes.eraser } },
    flags: { pixelPerfect: !!defaultFlags.pixelPerfect, stabilize: !!defaultFlags.stabilize },
  };
  let saved = null;
  try { const s = storage(); saved = s ? JSON.parse(s.getItem(BRUSH_PREFS_STORE) || 'null') : null; } catch (e) {}
  if (!saved || typeof saved !== 'object') return fallback;
  return {
    brushes: {
      pencil: brush(fallback.brushes.pencil, savedBrush(saved, 'pencil')),
      eraser: brush(fallback.brushes.eraser, savedBrush(saved, 'eraser')),
    },
    flags: {
      pixelPerfect: bool(savedFlag(saved, 'pixelPerfect'), fallback.flags.pixelPerfect),
      stabilize: bool(savedFlag(saved, 'stabilize'), fallback.flags.stabilize),
    },
  };
}

export function saveBrushPrefs(S) {
  try {
    const s = storage(); if (!s) return;
    s.setItem(BRUSH_PREFS_STORE, JSON.stringify({
      pencil: { size: clampSize(S.brushes.pencil.size), op: clamp01(S.brushes.pencil.op) },
      eraser: { size: clampSize(S.brushes.eraser.size), op: clamp01(S.brushes.eraser.op) },
      pixelPerfect: !!S.ppOn,
      stabilize: !!S.stabOn,
    }));
  } catch (e) {}
}
