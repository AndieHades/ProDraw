import { clampWindowSize, positionWindow } from "./FloatingWindowGeometry.ts";
import { viewportHeight, viewportWidth } from "./FloatingWindowRegistry.ts";
import type { FloatingWindowOptions, WindowMotionPorts } from "./FloatingWindowTypes.ts";

type Direction = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";
interface ResizeState {
  readonly bottom: number; readonly direction: Direction; readonly height: number;
  readonly left: number; readonly right: number; readonly startX: number;
  readonly startY: number; readonly top: number; readonly width: number;
}

function applySize(
  element: HTMLElement, width: number, height: number, options: FloatingWindowOptions
): { width: number; height: number } {
  const size = clampWindowSize(width, height, options.minW ?? 120, options.minH ?? 80);
  if (options.onResize) options.onResize(size.width, size.height);
  else {
    element.style.width = `${size.width}px`;
    element.style.height = `${size.height}px`;
  }
  return size;
}

export function restoreWindowSize(
  element: HTMLElement, width: number, height: number, options: FloatingWindowOptions
): void {
  applySize(element, width, height, options);
}

function attachResizeHandle(
  element: HTMLElement, handle: HTMLElement, direction: Direction,
  options: FloatingWindowOptions, ports: WindowMotionPorts
): void {
  let resize: ResizeState | null = null;
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault(); event.stopPropagation();
    try { handle.setPointerCapture(event.pointerId); } catch { /* optional */ }
    document.dispatchEvent(new window.CustomEvent("ui-close-popovers"));
    ports.bringToFront();
    const rect = element.getBoundingClientRect();
    resize = { direction, left: rect.left, top: rect.top, right: rect.right,
      bottom: rect.bottom, width: rect.width, height: rect.height,
      startX: event.clientX, startY: event.clientY };
  });
  handle.addEventListener("pointermove", (event) => {
    if (!resize) return;
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    const { direction } = resize;
    let width = resize.width + (direction.includes("e") ? dx :
      direction.includes("w") ? -dx : 0);
    let height = resize.height + (direction.includes("s") ? dy :
      direction.includes("n") ? -dy : 0);
    let left = direction.includes("w") ? resize.right - width : resize.left;
    let top = direction.includes("n") ? resize.bottom - height : resize.top;
    if (left < 4) { width = resize.right - 4; left = 4; }
    if (top < 4) { height = resize.bottom - 4; top = 4; }
    if (left + width > viewportWidth() - 4) width = viewportWidth() - 4 - left;
    if (top + height > viewportHeight() - 4) height = viewportHeight() - 4 - top;
    const size = applySize(element, width, height, options);
    if (direction.includes("w")) left = resize.right - size.width;
    if (direction.includes("n")) top = resize.bottom - size.height;
    if (direction.includes("w") || direction.includes("n")) {
      positionWindow(element, Math.max(4, left), Math.max(4, top));
    }
  });
  const end = (): void => { if (resize) { resize = null; ports.save(); } };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

export function bindWindowResize(
  element: HTMLElement, options: FloatingWindowOptions, ports: WindowMotionPorts
): void {
  if (options.handle) attachResizeHandle(element, options.handle, "se", options, ports);
  if (!options.resizeEdges) return;
  for (const direction of ["n", "e", "s", "w", "nw", "ne", "sw"] as const) {
    const handle = document.createElement("div");
    handle.className = `fw-rsz-edge fw-rsz-${direction}`;
    handle.setAttribute("aria-hidden", "true");
    element.appendChild(handle);
    attachResizeHandle(element, handle, direction, options, ports);
  }
}
