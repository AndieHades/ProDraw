// Создание кисти-штампа из выделенной области. Берёт видимый композит внутри
// выделения (или рамки трансформации), превращает альфу в маску (форма, не
// цвет — кисть recolorable), обрезает пустые края, добавляет кисть в текущий
// набор, делает её активной и снимает выделение — можно сразу рисовать.
// Pipeline: bounds → композит → trim → alpha-маска → stamp-asset → активна.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { toast, t } from '../../core/dom.js';
import { paintStack } from '../../core/composite.js';
import { makeCanvas } from '../../core/canvas.js';
import { inMask } from '../../core/selection.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { setTool } from '../../core/tools.js';
import { deselect } from '../selection/model.js';
import { BP_SMAX } from '../../config/limits.js';
import { ensureLib, lib, addBrush, allBrushes } from './data.js';

// приоритет: активное выделение → рамка трансформации → null
function region() {
  if (S.sel) return { x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1, masked: !!S.selMask };
  if (S.rotMode && S.rotMode.b) { const b = S.rotMode.b;
    const x0 = Math.max(0, b.x0), y0 = Math.max(0, b.y0), x1 = Math.min(S.W - 1, b.x0 + b.w - 1), y1 = Math.min(S.H - 1, b.y0 + b.h - 1);
    return x1 >= x0 && y1 >= y0 ? { x0, y0, x1, y1, masked: false } : null; }
  return null;
}
function composite() { const c = makeCanvas(S.W, S.H);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; paintStack(x, false);
  return x.getImageData(0, 0, S.W, S.H).data; }
function uniqueName() { const base = t('brush.stampName'), used = new Set(allBrushes().map((b) => b.name));
  let i = 1; const mk = (n) => base + ' ' + String(n).padStart(2, '0'); while (used.has(mk(i))) i++; return mk(i); }

export async function createFromSelection() {
  const reg = region();
  if (!reg) { toast(t('toast.selectAreaFirst')); return; }
  await ensureLib();
  const d = composite(), inReg = (x, y) => !reg.masked || inMask(x, y);
  let bx0 = reg.x1 + 1, by0 = reg.y1 + 1, bx1 = reg.x0 - 1, by1 = reg.y0 - 1; // непустой bbox по альфе
  for (let y = reg.y0; y <= reg.y1; y++) for (let x = reg.x0; x <= reg.x1; x++)
    if (inReg(x, y) && d[(y * S.W + x) * 4 + 3] > 0) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  if (bx1 < bx0) { toast(t('toast.selectionEmpty')); return; }
  const w = bx1 - bx0 + 1, h = by1 - by0 + 1, cov = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const x = bx0 + i, y = by0 + j;
    if (inReg(x, y)) cov[j * w + i] = d[(y * S.W + x) * 4 + 3]; } // альфа = маска (цвет берётся активный при рисовании)
  const setId = lib.curSet, name = uniqueName();
  const brush = await addBrush({ name, source: 'custom', shape: 'shape', cov: { w, h, data: cov }, grain: null, baseSize: Math.max(w, h), params: { spacing: 1, jitter: 0 } }, setId);
  const tool = S.tool === 'eraser' ? 'eraser' : 'pencil';
  setStampBrush(tool, brush); S.brushes[tool].size = BP_SMAX; // штамп в натуральном размере (слайдер масштабирует)
  setTool(tool); deselect();
  bus.emit('brushlib'); bus.emit('render');
  toast(t('toast.brushCreated', { name }));
}
