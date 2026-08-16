// Границы холста при экспорте: «текущий размер» (как есть) или «по видимым
// пикселям» (Trim). Trim считается по итоговому композиту, поэтому запечённые
// эффекты слоёв (обводка/свечение/тени) автоматически входят в границы.
import { alphaBounds } from '../../logic/raster.js';
import { makeCanvas } from '../../core/canvas.js';

// границы непрозрачных пикселей canvas (или null)
export function visibleBounds(canvas) {
  const W = canvas.width, H = canvas.height;
  return alphaBounds(canvas.getContext('2d').getImageData(0, 0, W, H).data, W, H);
}

// объединить несколько границ в одну (для «один размер на все файлы»)
export function unionBounds(list) {
  let b = null;
  for (const r of list) { if (!r) continue;
    if (!b) b = { ...r }; else { b.minx = Math.min(b.minx, r.minx); b.miny = Math.min(b.miny, r.miny); b.maxx = Math.max(b.maxx, r.maxx); b.maxy = Math.max(b.maxy, r.maxy); } }
  return b;
}

// вырезать прямоугольник b из canvas; b=null → пустой 1×1 (нечего экспортировать)
export function cropTo(canvas, b) {
  if (!b) return makeCanvas(1, 1);
  const w = b.maxx - b.minx + 1, h = b.maxy - b.miny + 1, c = makeCanvas(w, h);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(canvas, b.minx, b.miny, w, h, 0, 0, w, h); return c;
}

// применить выбранный режим границ к одному canvas
export function applyBounds(canvas, mode) {
  return mode === 'trim' ? cropTo(canvas, visibleBounds(canvas)) : canvas;
}
