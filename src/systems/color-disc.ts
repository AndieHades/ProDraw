// Геометрия HSV-диска пикера: размеры внешнего кольца тона и внутреннего
// SV-квадрата по DOM-замерам (с запасными значениями для headless). Чистая
// раскладка — отдельно от логики пикера ради размера модуля.
import { $ } from "../core/shell.ts";
import { DISC_INNER_RATIO } from "../config/color-disc.ts";
export { DISC_GAP, DISC_INNER_RATIO } from "../config/color-disc.ts";

export interface DiscBox {
  readonly left: number; readonly top: number;
  readonly width: number; readonly height: number;
}

function cssPx(el: HTMLElement | null, prop: "width" | "height"): number {
  const view = el?.ownerDocument?.defaultView;
  const cs = view?.getComputedStyle ? view.getComputedStyle(el as HTMLElement) : null;
  const n = cs ? parseFloat(cs[prop]) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function discBox(): DiscBox {
  const disc = $("col-disc");
  if (!disc) return { left: 0, top: 0, width: 286, height: 286 };
  const r = disc.getBoundingClientRect();
  const w = r.width || disc.clientWidth || cssPx(disc, "width") || 286;
  const h = r.height || disc.clientHeight || cssPx(disc, "height") || w;
  return { left: r.left || 0, top: r.top || 0, width: w, height: h };
}

export function svDiscBox(disc: DiscBox = discBox()): DiscBox {
  const sv = $("col-svdisc");
  const fallback = Math.round(Math.min(disc.width, disc.height) * DISC_INNER_RATIO);
  if (!sv) return { left: (disc.width - fallback) / 2,
    top: (disc.height - fallback) / 2, width: fallback, height: fallback };
  const r = sv.getBoundingClientRect();
  const d = r.width || sv.clientWidth || cssPx(sv, "width") || fallback;
  const left = r.width ? r.left - disc.left : (sv.offsetLeft || (disc.width - d) / 2);
  const top = r.height ? r.top - disc.top : (sv.offsetTop || (disc.height - d) / 2);
  return { left, top, width: d,
    height: r.height || sv.clientHeight || cssPx(sv, "height") || d };
}
