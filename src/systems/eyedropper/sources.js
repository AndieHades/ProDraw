// ColorPickSource: единый интерфейс «какой цвет под курсором» для пипетки.
// Реализации — холст, окно референса, палитра. Каждая по экранным координатам
// решает, над ней ли курсор, переводит их в локальные и берёт цвет.
// Возврат: [r,g,b] — цвет; null — над источником, но прозрачно/нет цвета;
// undefined — курсор не над этим источником.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { gridAt } from '../../core/viewport.js';
import { compositeAt } from '../../core/layer-cache.js';

const inRect = (el, x, y) => { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };

// холст: итоговый видимый цвет (слои+порядок+прозрачность+эффекты+zoom/pan)
function fromCanvas(x, y) { const cv = $('cv'); if (!inRect(cv, x, y)) return undefined;
  let [gx, gy] = gridAt(x, y);
  if (S.tile && S.tile.on) { gx = ((gx % S.W) + S.W) % S.W; gy = ((gy % S.H) + S.H) % S.H; } // Tile Mode: пипетка по любому тайлу
  if (gx < 0 || gy < 0 || gx >= S.W || gy >= S.H) return undefined;
  return compositeAt(gx, gy) || null; }

// референс: читаем реально отрисованные пиксели #refcv — zoom/pan/поворот учтены сами
function fromReference(x, y) { const win = $('refwin'); if (!win || !win.classList.contains('on')) return undefined;
  const cv = $('refcv'); if (!inRect(cv, x, y)) return undefined;
  try { const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    const px = cv.getContext('2d', { willReadFrequently: true }).getImageData(Math.round((x - r.left) * dpr), Math.round((y - r.top) * dpr), 1, 1).data;
    return px[3] > 10 ? [px[0], px[1], px[2]] : null; } catch (e) { return null; } }

// палитра: swatch под курсором → его цвет из S.palette
function fromPalette(x, y) { const el = document.elementFromPoint(x, y), sw = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
  if (!sw) return undefined; const c = S.palette[+sw.dataset.i]; return c ? c.slice() : null; }

// приоритет: палитра → референс → холст
export function sampleColor(x, y) { for (const src of [fromPalette, fromReference, fromCanvas]) { const c = src(x, y); if (c !== undefined) return c; } return undefined; }
