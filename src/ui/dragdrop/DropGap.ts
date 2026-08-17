import {
  DROP_CENTER_RATIO, DROP_GAP_RATIO, PHYSICAL_DROP_GAP
} from "../../config/drag-drop.ts";

export interface DropGapOptions {
  readonly axis?: "x" | "y";
  readonly className?: string;
  readonly enabled?: boolean;
  readonly min?: number;
  readonly ratio?: number;
}

export interface DropGap {
  readonly active: boolean;
  readonly after: boolean;
  readonly el: HTMLDivElement;
  readonly element: HTMLDivElement;
  readonly target: Element | null;
  cancel(): void;
  close(): void;
  next(selector?: string, ignored?: ReadonlySet<Element>): Element | null;
  remove(): void;
  request(parent: Node | null, node: Element | null, after: boolean,
    sample: Element | null, key: string, delay?: number): void;
  show(parent: Node | null, node: Element | null, after?: boolean,
    sample?: Element | null): void;
}

export function makeDropGap(options: DropGapOptions = {}): DropGap {
  const axis = options.axis ?? "x";
  const ratio = options.ratio ?? DROP_GAP_RATIO;
  const minimum = options.min ?? 1;
  const enabled = options.enabled ?? true;
  const element = document.createElement("div");
  element.className = ["drop-gap", `drop-gap-${axis}`, options.className ?? ""]
    .filter(Boolean).join(" ");
  let target: Element | null = null;
  let after = false;
  let active = false;
  let closing = false;
  let size = 0;
  let activeKey = "";
  let pendingKey = "";
  let timer: number | null = null;
  const clearTimer = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };
  const sampleSize = (sample: Element | null): number => {
    if (!sample) return minimum;
    const rect = sample.getBoundingClientRect();
    return Math.max(minimum, Math.round((axis === "y" ? rect.height : rect.width) * ratio));
  };
  const gap: DropGap = {
    el: element,
    element,
    get target() { return target; },
    get after() { return after; },
    get active() { return active; },
    show(parent, node, placeAfter = false, sample = node) {
      if (!parent) return;
      if (node && node.parentNode !== parent) {
        target = null; after = false; active = false; pendingKey = ""; return;
      }
      const nextSize = sampleSize(sample);
      const same = active && target === node && after === placeAfter;
      target = node; after = placeAfter; active = true; pendingKey = ""; closing = false;
      if (!enabled || !PHYSICAL_DROP_GAP) return;
      if (element.parentNode && element.classList.contains("closing")) element.remove();
      element.classList.remove("closing");
      if (!same || !size) {
        size = nextSize; element.style.setProperty("--drop-gap-size", `${size}px`);
      }
      const reference = node ? (placeAfter ? node.nextSibling : node) : null;
      if (element.parentNode !== parent || reference !== element) parent.insertBefore(element, reference);
    },
    request(parent, node, placeAfter, sample, key, delay = 0) {
      if (!key) { gap.cancel(); return; }
      if ((active && activeKey === key) || pendingKey === key) return;
      clearTimer(); pendingKey = key; gap.close();
      timer = window.setTimeout(() => {
        if (pendingKey !== key) return;
        activeKey = key; gap.show(parent, node, placeAfter, sample);
      }, delay);
    },
    cancel() { clearTimer(); pendingKey = ""; gap.close(); },
    next(selector, ignored = new Set()) {
      if (!active) return null;
      let node = after ? target?.nextElementSibling ?? null : target;
      while (node && (node === element || (selector && !node.matches(selector)) ||
        ignored.has(node))) node = node.nextElementSibling;
      return node;
    },
    close() {
      target = null; after = false; active = false; activeKey = "";
      if (!element.parentNode || closing) return;
      closing = true; element.classList.add("closing");
      window.setTimeout(() => {
        if (!closing) return;
        element.remove(); closing = false; size = 0;
      }, 180);
    },
    remove() {
      clearTimer(); pendingKey = ""; activeKey = ""; closing = false;
      element.remove(); target = null; after = false; active = false; size = 0;
    }
  };
  return gap;
}

export function dropZone(
  element: Element, x: number, y: number, axis: "x" | "y" = "x",
  centerRatio = DROP_CENTER_RATIO
): { readonly after: boolean; readonly zone: "after" | "before" | "center" } {
  const rect = element.getBoundingClientRect();
  const size = axis === "y" ? rect.height : rect.width;
  const position = size > 0 ? (axis === "y" ? y - rect.top : x - rect.left) / size : 0.5;
  const padding = Math.max(0, Math.min(0.49, (1 - centerRatio) / 2));
  const after = position >= 0.5;
  return { zone: position > padding && position < 1 - padding ? "center" :
    after ? "after" : "before", after };
}
