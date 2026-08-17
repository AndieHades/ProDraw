// Цвета холста для JS-рендера, читаются из CSS-токенов (var(--cv-*)) и
// обновляются при смене темы. Дефолты — тёмная тема (на случай headless).
import * as bus from "../core/bus.ts";

export const C = {
  bg: "#0d0d10", doc: "#141419", edge: "rgba(255,255,255,.28)",
  grid: "rgba(255,255,255,.05)", accent: "#3d8bfd", fg: "#fff",
  tileGrid: "#ff9f43", checkA: "#26262c", checkB: "#1d1d23",
  prevBg: "#101014", hint: "#9a9aa3"
};
type CanvasColorName = keyof typeof C;
const KEYS: Readonly<Record<CanvasColorName, string>> = {
  bg: "--cv-bg", doc: "--cv-doc", edge: "--cv-edge", grid: "--cv-grid",
  accent: "--accent", fg: "--cv-fg", tileGrid: "--cv-tilegrid",
  checkA: "--cv-check-a", checkB: "--cv-check-b", prevBg: "--cv-prev-bg",
  hint: "--cv-hint"
};

export function refreshColors(): void {
  if (typeof getComputedStyle !== "function") return;
  const cs = getComputedStyle(document.documentElement);
  for (const key of Object.keys(KEYS) as CanvasColorName[]) {
    const value = cs.getPropertyValue(KEYS[key]).trim();
    if (value) C[key] = value;
  }
}

bus.on("theme", refreshColors);
