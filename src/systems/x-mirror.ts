// Зеркальная кисть по горизонтали при зажатом X: пока клавиша держится, мазки
// дублируются по центральной вертикальной оси (через S.xMirror в symmetryConfig).
import { S } from "../core/state.ts";
import * as bus from "../core/bus.ts";

const typing = (t: EventTarget | null): boolean => {
  const element = t as (Element & { isContentEditable?: boolean }) | null;
  return !!(element?.matches?.("input, textarea") || element?.isContentEditable);
};
const set = (on: boolean): void => {
  if (S["xMirror"] === on) return; S["xMirror"] = on; bus.emit("render");
};

export function mount(): void {
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyX" || e.repeat) return;
    // не во время ввода/диалога
    if (typing(e.target) || document.querySelector(".ovl.on")) return;
    set(true);
  });
  window.addEventListener("keyup", (e) => { if (e.code === "KeyX") set(false); });
  // потеря фокуса не оставляет зеркало включённым
  window.addEventListener("blur", () => set(false));
}
