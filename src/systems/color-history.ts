// История использованных на холсте цветов: ряд свотчей под пикером, в
// localStorage. Часть Color Picker — отдельный модуль ради размера. Клик по
// свотчу делегируется обратно в пикер через колбэк, заданный initColorHistory.
import { $ } from "../core/shell.ts";
import { rgbToHex } from "../logic/color.ts";

const STORE = "pixel-heart:color-used-history";
const key = (c: readonly number[] | null | undefined): string =>
  c ? c.slice(0, 3).join(",") : "";
let hist: number[][] = [];
let pick: (color: number[]) => void = () => undefined;

function load(): void {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORE) || "[]");
    hist = (Array.isArray(raw) ? raw : [])
      .filter((c): c is number[] => Array.isArray(c) && c.length >= 3)
      .map((c) => c.slice(0, 3));
  } catch { hist = []; }
}
function save(): void {
  try { localStorage.setItem(STORE, JSON.stringify(hist)); } catch { /* full */ }
}

export function renderColorHistory(): void {
  const host = $("col-hist"); if (!host) return; host.replaceChildren();
  for (const c of hist.slice(0, 10)) {
    const b = document.createElement("button"), hex = rgbToHex(c).toUpperCase();
    b.type = "button"; b.style.background = hex; b.title = hex;
    b.onclick = () => pick(c); host.appendChild(b);
  }
}

// добавить реально использованный цвет в начало (без дублей), не более 10
export function rememberUsedColor(c: unknown): void {
  if (!Array.isArray(c) || c.length < 3) return;
  const color = (c as number[]).slice(0, 3);
  hist = [color, ...hist.filter((x) => key(x) !== key(color))].slice(0, 10);
  save(); renderColorHistory();
}

export function clearColorHistory(): void { hist = []; save(); renderColorHistory(); }

// onPick(c) — что делать при клике по свотчу истории (выбрать цвет в пикере)
export function initColorHistory(onPick: (color: number[]) => void): void {
  pick = onPick; load(); renderColorHistory();
}
