// Общее ядро кисти-штампа: маска кончика, фильтр дизер-тайла и план одного
// даба (режим + spacing/jitter). Переиспользуется движком рисования и
// тест-канвасом окна настроек — без дублирования логики. Чистые функции.
import { coverageToMask, maskRound } from './brush-mask.js';
import { BRUSH_MASK, BRUSH_SCATTER } from '../config/brush-import.js';

// маска кончика по записи кисти: из покрытия или дефолтный круг.
export function brushMask(sb, size) { return sb.cov ? coverageToMask(sb.cov, size, BRUSH_MASK) : maskRound(size); }

// дизер-тайл в координатах холста (g — бинарный тайл или null).
export const grainAt = (g, x, y) => !g || !!g.data[(((y % g.h) + g.h) % g.h) * g.w + (((x % g.w) + g.w) % g.w)];

// реальный отпечаток одного даба в координатах холста: маска кончика уже
// отфильтрована grain/dither так же, как при рисовании.
export function brushFootprint(sb, size, cx = 0, cy = 0) {
  const m = brushMask(sb, size); if (!m) return null;
  const g = sb && sb.grain; if (!g) return m;
  const out = new Uint8Array(m.w * m.h), ox = m.w >> 1, oy = m.h >> 1;
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
    if (m.data[j * m.w + i] && grainAt(g, cx - ox + i, cy - oy + j)) out[j * m.w + i] = 1;
  }
  return { w: m.w, h: m.h, data: out };
}

// размер штампа: кисти из выделения — натуральный (baseSize × слайдер), иначе слайдер.
export function stampSize(sb, slider, smax) { return sb && sb.baseSize ? Math.max(1, Math.round(sb.baseSize * slider / smax)) : slider; }

// «нестандартная» кисть: со своей формой/натуральным размером (из выделения или
// импорта), в отличие от базовых круга/квадрата/дизера. Такие при выборе встают
// в натуральный размер (слайдер = max), чтобы отпечаток совпадал с видом в палитре.
export function brushHasShape(b) { return !!(b && (b.baseSize || (b.cov && (b.cov.w > 1 || b.cov.h > 1)))); }

// режим: явный params.mode либо вывод по параметрам (обратная совместимость).
// 'flow' — непрерывный поток, 'single' — единичный штамп (по spacing),
// 'scatter' — разброс штампов разного размера.
export function brushMode(p) { if (p && p.mode) return p.mode; if (p && p.jitter > 0) return 'scatter'; if (p && p.spacing > 0) return 'single'; return 'flow'; }

// план даба для штриха. state.acc — счётчик (сброс в начале штриха).
// Возвращает { cx, cy, size } или null (пропуск по spacing).
export function planDab(params, size, state, x, y) {
  const p = params || {}, mode = brushMode(p);
  if (mode === 'flow') return { cx: x, cy: y, size };
  const gap = Math.max(1, Math.round((p.spacing || 1) * size));
  if (state.acc++ % gap) return null;
  let cx = x, cy = y, ds = size;
  if (mode === 'scatter') {
    if (p.jitter > 0) { const r = p.jitter * size * BRUSH_SCATTER.jitterScale, a = Math.random() * 6.2832, d = Math.random() * r;
      cx += Math.round(Math.cos(a) * d); cy += Math.round(Math.sin(a) * d); }
    if (p.sizeJitter > 0) ds = Math.max(1, Math.round(size * (1 - p.sizeJitter * Math.random())));
  }
  return { cx, cy, size: ds };
}
