import { DRAG_THRESHOLD, LONG_PRESS_MS } from "../../config/timings.ts";

export interface ReorderOptions {
  readonly accept?: (element: HTMLElement, container: HTMLElement) => boolean;
  readonly dropSel: string;
  readonly itemSel: string;
  readonly save: () => void;
  readonly squelch: () => void;
}

interface ReorderState extends ReorderOptions {
  armed: boolean;
  readonly element: HTMLElement;
  ghost?: HTMLElement;
  hold?: number;
  moved: boolean;
  readonly startX: number;
  readonly startY: number;
}

let current: ReorderState | null = null;
let documentBound = false;
const closePopovers = (): void => {
  document.dispatchEvent(new window.CustomEvent("ui-close-popovers"));
};

function canDrop(state: ReorderState, container: HTMLElement): boolean {
  return !state.accept || state.accept(state.element, container);
}

function beginDrag(state: ReorderState): void {
  closePopovers();
  state.moved = true;
  state.element.classList.add("reordering");
  state.ghost = state.element.cloneNode(true) as HTMLElement;
  state.ghost.classList.add("reorder-ghost");
  document.body.appendChild(state.ghost);
}

function onMove(event: PointerEvent): void {
  const state = current;
  if (!state) return;
  const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
  if (!state.armed) {
    if (distance > DRAG_THRESHOLD) cancelPending(state);
    return;
  }
  if (!state.moved && distance <= DRAG_THRESHOLD) return;
  if (!state.moved) beginDrag(state);
  if (!state.ghost) return;
  state.ghost.style.left = `${event.clientX}px`;
  state.ghost.style.top = `${event.clientY}px`;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const item = target?.closest<HTMLElement>(state.itemSel) ?? null;
  const container = target?.closest<HTMLElement>(state.dropSel) ?? null;
  const parent = item?.parentElement;
  if (item && item !== state.element && parent && canDrop(state, parent)) {
    const rect = item.getBoundingClientRect();
    parent.insertBefore(state.element,
      event.clientX < rect.left + rect.width / 2 ? item : item.nextSibling);
  } else if (container && !container.contains(state.element) && canDrop(state, container)) {
    container.appendChild(state.element);
  }
}

function cancelPending(state: ReorderState): void {
  if (state.hold !== undefined) window.clearTimeout(state.hold);
  if (current === state) current = null;
}

function onUp(): void {
  const state = current;
  if (!state) return;
  cancelPending(state);
  state.ghost?.remove();
  state.element.classList.remove("reordering");
  if (state.moved) { state.squelch(); state.save(); }
}

function bindDocument(): void {
  if (documentBound) return;
  documentBound = true;
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

export function attachReorder(element: HTMLElement, options: ReorderOptions): void {
  bindDocument();
  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      const state: ReorderState = { ...options, element, startX: event.clientX,
        startY: event.clientY, armed: false, moved: false };
      state.hold = window.setTimeout(() => {
        if (current !== state) return;
        state.armed = true;
        closePopovers();
      }, LONG_PRESS_MS);
      current = state;
    } else if (event.button === 2) {
      event.preventDefault();
      closePopovers();
      current = { ...options, element, startX: event.clientX,
        startY: event.clientY, armed: true, moved: false };
    }
  });
}
