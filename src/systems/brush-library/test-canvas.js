// Тест-канвас окна настроек: рисуешь — видишь поведение активной кисти
// (режим/размер/расстояние/разброс) активным цветом. Тот же штамп-движок
// (logic/brush-stamp), без дублирования. Отдельная скретч-сетка, не холст.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { BP_SMAX } from '../../config/limits.js';
import { brushMask, grainAt, stampSize, planDab } from '../../logic/brush-stamp.js';
import { C } from '../../styles/canvas-colors.js';

const TW = 46, TH = 30, Z = 4;
let grid = new Uint8Array(TW * TH), st = { acc: 0 }, last = null, getMode = () => 'pencil', ctx = null;

function render() { if (!ctx) return;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { ctx.fillStyle = (x + y) & 1 ? C.checkA : C.checkB; ctx.fillRect(x * Z, y * Z, Z, Z); }
  const c = S.active; ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (grid[y * TW + x]) ctx.fillRect(x * Z, y * Z, Z, Z);
}
function stamp(x, y) { const sb = S.stampBrush[getMode()]; if (!sb) return;
  const dab = planDab(sb.params, stampSize(sb, S.brushes[getMode()].size, BP_SMAX), st, x, y); if (!dab) return;
  const m = brushMask(sb, dab.size); if (!m) return; const ox = m.w >> 1, oy = m.h >> 1, g = sb.grain || null;
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.data[j * m.w + i]) { const px = dab.cx - ox + i, py = dab.cy - oy + j;
    if (px >= 0 && py >= 0 && px < TW && py < TH && grainAt(g, px, py)) grid[py * TW + px] = 1; } }
function line(a, b) { let x0 = a[0], y0 = a[1]; const x1 = b[0], y1 = b[1], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx - dy;
  for (;;) { stamp(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } } }

export function clearTest() { grid = new Uint8Array(TW * TH); render(); }
export function initTestCanvas(modeFn) { getMode = modeFn; const cv = $('bs-test'); cv.width = TW * Z; cv.height = TH * Z; ctx = cv.getContext('2d'); render();
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / Z), Math.floor((e.clientY - r.top) / Z)]; };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); grid = new Uint8Array(TW * TH); st.acc = 0; last = pt(e); stamp(last[0], last[1]); render(); });
  cv.addEventListener('pointermove', (e) => { if (!last) return; const p = pt(e); line(last, p); last = p; render(); });
  const up = () => { last = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
