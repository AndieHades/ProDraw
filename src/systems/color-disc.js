// Геометрия HSV-диска пикера: размеры внешнего кольца тона и внутреннего
// SV-квадрата по DOM-замерам (с запасными значениями для headless). Чистая
// раскладка — отдельно от логики пикера ради размера модуля.
import { $ } from '../core/dom.js';

export const DISC_INNER_RATIO = 2 / 3, DISC_GAP = 5;

function cssPx(el, prop) {
  const view = el && el.ownerDocument && el.ownerDocument.defaultView;
  const cs = view && view.getComputedStyle ? view.getComputedStyle(el) : null;
  const n = cs ? parseFloat(cs[prop]) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function discBox() {
  const disc = $('col-disc'), r = disc.getBoundingClientRect();
  const w = r.width || disc.clientWidth || cssPx(disc, 'width') || 286;
  const h = r.height || disc.clientHeight || cssPx(disc, 'height') || w;
  return { left: r.left || 0, top: r.top || 0, width: w, height: h };
}

export function svDiscBox(disc = discBox()) {
  const sv = $('col-svdisc'), r = sv.getBoundingClientRect();
  const d = r.width || sv.clientWidth || cssPx(sv, 'width') || Math.round(Math.min(disc.width, disc.height) * DISC_INNER_RATIO);
  const left = r.width ? r.left - disc.left : (sv.offsetLeft || (disc.width - d) / 2);
  const top = r.height ? r.top - disc.top : (sv.offsetTop || (disc.height - d) / 2);
  return { left, top, width: d, height: r.height || sv.clientHeight || cssPx(sv, 'height') || d };
}
