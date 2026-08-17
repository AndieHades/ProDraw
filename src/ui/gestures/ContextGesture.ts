import { LONG_PRESS_MS } from "../../config/timings.ts";

export type PointHandler = (x: number, y: number) => void;
let lastTap = { at: 0, x: 0, y: 0 };
let contextSquelchUntil = 0;

export function longPress(element: HTMLElement, handler: PointHandler): void {
  let timer: number | null = null;
  let startX = 0;
  let startY = 0;
  const clear = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault(); event.stopPropagation();
    handler(event.clientX, event.clientY);
  });
  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    startX = event.clientX; startY = event.clientY; clear();
    timer = window.setTimeout(() => handler(startX, startY), LONG_PRESS_MS);
  });
  element.addEventListener("pointermove", (event) => {
    if (timer !== null && Math.hypot(event.clientX - startX,
      event.clientY - startY) > 8) clear();
  });
  element.addEventListener("pointerup", clear);
  element.addEventListener("pointercancel", clear);
}

export function onDoubleTap(
  element: HTMLElement, handler: PointHandler, ignoreSelector?: string
): void {
  element.addEventListener("pointerup", (event) => {
    if (event.button !== 0) return;
    const target = event.target as Element | null;
    if (ignoreSelector && typeof target?.closest === "function" &&
      target.closest(ignoreSelector)) return;
    const now = Date.now();
    if (now - lastTap.at < 320 && Math.hypot(
      event.clientX - lastTap.x, event.clientY - lastTap.y) < 24) {
      lastTap.at = 0; handler(event.clientX, event.clientY);
    } else lastTap = { at: now, x: event.clientX, y: event.clientY };
  });
}

export function squelchContextMenu(milliseconds = 400): void {
  contextSquelchUntil = Date.now() + milliseconds;
}

export function onContext(element: HTMLElement, handler: PointHandler): void {
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault(); event.stopPropagation();
    if (Date.now() >= contextSquelchUntil) handler(event.clientX, event.clientY);
  });
}

export function menuGesture(
  element: HTMLElement, handler: PointHandler, ignoreSelector?: string
): void {
  onContext(element, handler);
  onDoubleTap(element, handler, ignoreSelector);
}
