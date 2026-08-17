import type { WindowMotionPorts } from "./FloatingWindowTypes.ts";

const INTERACTIVE = "button,input,select,textarea,label,a,[contenteditable=\"true\"]";
const NO_DRAG = `${INTERACTIVE},canvas,.fw-nodrag,.fw-rsz-edge,#col-disc`;
interface DragState { readonly id: number; readonly dx: number; readonly dy: number }

function scrolls(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return /(auto|scroll)/.test(style.overflowY + style.overflowX);
}

function canDragFrom(
  target: Element, element: HTMLElement, grip: HTMLElement, rootScrolls: boolean
): boolean {
  if (target.closest(NO_DRAG)) return false;
  if (grip !== element && grip.contains(target)) return true;
  if (rootScrolls) return false;
  for (let node: Element | null = target; node && node !== element; node = node.parentElement) {
    if (scrolls(node)) return false;
  }
  return true;
}

export function bindWindowDrag(
  element: HTMLElement, grip: HTMLElement, ports: WindowMotionPorts
): void {
  const rootScrolls = scrolls(element);
  if (!rootScrolls) element.classList.add("fw-win");
  let drag: DragState | null = null;
  element.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (event.button > 0 || drag || !target || !("closest" in target) ||
      typeof target.closest !== "function" ||
      !canDragFrom(target as Element, element, grip, rootScrolls)) return;
    document.dispatchEvent(new window.CustomEvent("ui-close-popovers"));
    try { element.setPointerCapture(event.pointerId); } catch { /* optional */ }
    ports.bringToFront();
    const rect = element.getBoundingClientRect();
    drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
  });
  element.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault();
    ports.place(event.clientX - drag.dx, event.clientY - drag.dy);
  });
  const end = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    ports.save();
  };
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", end);
}
