// Trim — подгоняет холст под реальные границы ВСЕХ слоёв: непустые пиксели,
// пиксели за краем (ext) И охват видимых эффектов (обводка/свечение/тень). Есть
// пустые поля → обрезает; контент/эффект выходят за холст → расширяет; впритык → ничего.
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { boundsFor, canvasContentBounds } from '../core/canvas-bounds.js';
import { applyCropRect } from '../core/document.js';
import { toast, t } from '../core/dom.js';
import { activeTimelineBounds } from '../core/animation-canvas.js';

export function trimCanvas() {
  const g = activeTimelineBounds((layers, folders) => boundsFor(layers, folders), canvasContentBounds);
  if (!g) { toast(t('toast.canvasEmpty')); return; }
  if (g.minx === 0 && g.miny === 0 && g.maxx === S.W - 1 && g.maxy === S.H - 1) { toast(t('toast.nothingTrim')); return; } // холст уже впритык
  applyCropRect(g.minx, g.miny, g.maxx, g.maxy); // меньше холста → обрезка; больше → расширение и показ
}

actions.register('canvas.trim', trimCanvas);
