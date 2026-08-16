// Активная импортированная кисть-штамп — отдельная для карандаша и ластика.
// Запись кончика + токен для кеша маски (меняется при каждой смене кисти).
import { S } from './state.js';

let seq = 0;
export function setStampBrush(tool, rec) { S.stampBrush[tool] = rec ? { ...rec, tok: ++seq } : null; }
export function clearStampBrush(tool) { if (tool) S.stampBrush[tool] = null; else S.stampBrush = { pencil: null, eraser: null }; }
