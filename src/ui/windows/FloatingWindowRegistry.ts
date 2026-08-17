const windows = new Set<HTMLElement>();
const alwaysOnTop = new WeakSet<HTMLElement>();
const NORMAL_Z_BASE = 30;
const NORMAL_Z_MAX = 860;
const TOOLBAR_Z = 900;
const TOPBAR = 58;
let zTop = NORMAL_Z_BASE;

export const viewportWidth = (): number =>
  window.innerWidth || document.documentElement.clientWidth || 1024;
export const viewportHeight = (): number =>
  window.innerHeight || document.documentElement.clientHeight || 768;

export function windowHost(element: HTMLElement): HTMLElement {
  return element.closest<HTMLElement>(".ovl") ?? element;
}

export function isShown(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}

function zIndexOf(element: HTMLElement): number {
  const host = windowHost(element);
  const value = Number.parseFloat(window.getComputedStyle(host).zIndex || host.style.zIndex);
  return Number.isFinite(value) ? value : 0;
}

function rebalanceNormalZ(): void {
  const visible = [...windows].filter((element) =>
    !alwaysOnTop.has(element) && isShown(element)).sort((a, b) => zIndexOf(a) - zIndexOf(b));
  zTop = NORMAL_Z_BASE;
  for (const element of visible) {
    const host = windowHost(element);
    host.style.zIndex = String(++zTop);
    if (host !== element) element.style.zIndex = "";
  }
}

export function nextFloatingZ(): number {
  if (zTop >= NORMAL_Z_MAX) rebalanceNormalZ();
  return ++zTop;
}

export function registerWindow(element: HTMLElement, isAlwaysOnTop: boolean): void {
  windows.add(element);
  if (isAlwaysOnTop) alwaysOnTop.add(element);
}

export function bringToFront(element: HTMLElement, isAlwaysOnTop: boolean): void {
  const host = windowHost(element);
  host.style.zIndex = String(isAlwaysOnTop ? TOOLBAR_Z : nextFloatingZ());
  if (host !== element) element.style.zIndex = "";
}

function intersects(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function overlapsWindow(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return [...windows].some((other) => other !== element && isShown(other) &&
    intersects(rect, other.getBoundingClientRect()));
}

export function findFreeSpot(element: HTMLElement): { left: number; top: number } | null {
  const rect = element.getBoundingClientRect();
  const occupied = [...windows].filter((other) => other !== element && isShown(other))
    .map((other) => other.getBoundingClientRect());
  for (let top = TOPBAR; top + rect.height <= viewportHeight() - 8; top += 24) {
    for (let left = 8; left + rect.width <= viewportWidth() - 8; left += 24) {
      const candidate = new window.DOMRect(left, top, rect.width, rect.height);
      if (!occupied.some((other) => intersects(candidate, other))) return { left, top };
    }
  }
  return null;
}

export const floatingWindowTop = (): number => TOPBAR;
