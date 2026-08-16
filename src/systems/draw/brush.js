// Штамп кисти/ластика: квадрат size×size либо маска импортированной кисти.
// Ядро (маска/grain/режим/scatter) — общее в logic/brush-stamp.js (то же
// поведение в тест-канвасе настроек). Здесь — применение к холсту: симметрия,
// выделение, альфа (через paintCell).
import { S } from '../../core/state.js';
import { symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.js';
import { paintCell } from './cells.js';
import { ppVisit } from './pixel-perfect.js';
import { brushMask, grainAt, stampSize, planDab } from '../../logic/brush-stamp.js';
import { BP_SMAX } from '../../config/limits.js';

let cTok = -1, cSize = -1, cMask = null; const state = { acc: 0 }; // кеш маски + счётчик spacing
export function resetScatter() { state.acc = 0; } // в начале штриха
function maskOf(sb, size) { if (sb.tok === cTok && size === cSize) return cMask; cMask = brushMask(sb, size); cTok = sb.tok; cSize = size; return cMask; }

function paintSym(x, y, erase, g, paint) {
  for (const [px, py] of mirrorPoints(x, y, S.W, S.H, false, false, symmetryConfig())) if (grainAt(g, px, py)) paint(px, py, erase);
}
function footprint(cx, cy, erase, m, g, paint) { const ox = m.w >> 1, oy = m.h >> 1;
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
    const si = S.xMirror ? m.w - 1 - i : i; // зажатый X — горизонтальный флип маски кисти
    if (m.data[j * m.w + si]) paintSym(cx - ox + i, cy - oy + j, erase, g, paint);
  } }

export function brushStampWith(x, y, tool, paint, erase = false) {
  const slider = S.brushes[tool].size, sb = S.stampBrush[tool];
  if (sb) { const dab = planDab(sb.params, stampSize(sb, slider, BP_SMAX), state, x, y); if (!dab) return;
    const m = maskOf(sb, dab.size); if (m) footprint(dab.cx, dab.cy, erase, m, sb.grain || null, paint); return; }
  if (slider === 1 && paint === paintCell) ppVisit(x, y);
  const off = slider >> 1;
  for (let dy = 0; dy < slider; dy++) for (let dx = 0; dx < slider; dx++) paintSym(x - off + dx, y - off + dy, erase, null, paint);
}

export function brushStamp(x, y, erase) {
  brushStampWith(x, y, erase ? 'eraser' : 'pencil', paintCell, erase);
}
