import { bindWindowDrag } from "./FloatingWindowDrag.ts";
import { placeWindow } from "./FloatingWindowGeometry.ts";
import {
  bringToFront, findFreeSpot, floatingWindowTop, isShown, nextFloatingZ,
  overlapsWindow, registerWindow, viewportWidth, windowHost
} from "./FloatingWindowRegistry.ts";
import { bindWindowResize, restoreWindowSize } from "./FloatingWindowResize.ts";
import type { FloatingWindowOptions, WindowGeometry, WindowMotionPorts } from "./FloatingWindowTypes.ts";

export type { FloatingWindowOptions } from "./FloatingWindowTypes.ts";
export { nextFloatingZ };
const mounted = new WeakSet<HTMLElement>();
const INTERACTIVE = "button,input,select,textarea,label,a,[contenteditable=\"true\"]";

function readGeometry(key: string): Partial<WindowGeometry> | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return value && typeof value === "object" ? value as Partial<WindowGeometry> : null;
  } catch { return null; }
}

function saveGeometry(key: string | undefined, element: HTMLElement): void {
  if (!key) return;
  const rect = element.getBoundingClientRect();
  try { localStorage.setItem(key, JSON.stringify({ l: rect.left, t: rect.top,
    w: rect.width, h: rect.height })); } catch { /* optional */ }
}

export function floatingWindow(
  element: HTMLElement, options: FloatingWindowOptions = {}
): void {
  if (mounted.has(element)) return;
  mounted.add(element);
  const grip = options.grip ?? element;
  const clampRight = options.clampRight ?? 70;
  const clampBottom = options.clampBottom ?? 50;
  const topmost = options.alwaysOnTop ?? false;
  let placed = false;
  const ports: WindowMotionPorts = {
    bringToFront: () => bringToFront(element, topmost),
    place: (left, top) => placeWindow(element, left, top, clampRight, clampBottom),
    save: () => { placed = true; saveGeometry(options.storeKey, element); }
  };
  if (options.storeKey) {
    const geometry = readGeometry(options.storeKey);
    const left = geometry?.left ?? (geometry as { l?: number } | null)?.l;
    const top = geometry?.top ?? (geometry as { t?: number } | null)?.t;
    const width = geometry?.width ?? (geometry as { w?: number } | null)?.w;
    const height = geometry?.height ?? (geometry as { h?: number } | null)?.h;
    if (left !== undefined && top !== undefined) {
      ports.place(left, top); placed = true;
      if (width && height && (options.handle || options.onResize)) {
        restoreWindowSize(element, width, height, options);
      }
    }
  }
  element.querySelector<HTMLElement>(".win-x")?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (options.onClose) options.onClose(); else element.classList.remove("on");
  });
  if (options.onHeaderDblClick) grip.addEventListener("dblclick", (event) => {
    const target = event.target;
    if (target && "closest" in target && typeof target.closest === "function" &&
      target.closest(INTERACTIVE)) return;
    event.preventDefault(); event.stopPropagation();
    document.dispatchEvent(new window.CustomEvent("ui-close-popovers"));
    ports.bringToFront(); options.onHeaderDblClick?.(event); ports.save();
  });
  element.addEventListener("pointerdown", ports.bringToFront, true);
  bindWindowDrag(element, grip, ports);
  bindWindowResize(element, options, ports);
  registerWindow(element, topmost);
  const onShow = (): void => {
    ports.bringToFront();
    if (placed || options.avoidOverlap === false || !overlapsWindow(element)) return;
    const rect = element.getBoundingClientRect();
    const spot = findFreeSpot(element);
    ports.place(spot?.left ?? Math.max(4, (viewportWidth() - rect.width) / 2),
      spot?.top ?? floatingWindowTop());
    ports.save();
  };
  let wasShown = isShown(element);
  const observer = new window.MutationObserver(() => {
    const visible = isShown(element);
    if (visible && !wasShown) onShow();
    wasShown = visible;
  });
  observer.observe(element, { attributes: true, attributeFilter: ["class", "style"] });
  const host = windowHost(element);
  if (host !== element) observer.observe(host,
    { attributes: true, attributeFilter: ["class", "style"] });
}
