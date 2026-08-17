import {
  defaultSidebarHeight, defaultSidebarWidth, resetPalette, resizePalette, resizeSidebar
} from "./ShellWindowMetrics.ts";

export interface FloatingWindowOptions {
  readonly avoidOverlap?: boolean;
  readonly clampBottom?: number;
  readonly clampRight?: number;
  readonly grip?: HTMLElement;
  readonly handle?: HTMLElement;
  readonly minH?: number;
  readonly minW?: number;
  readonly onClose?: () => void;
  readonly onHeaderDblClick?: () => void;
  readonly onResize?: (width: number, height: number) => void;
  readonly storeKey?: string | undefined;
}

export interface PreservedShellLayoutPorts {
  readonly fitView: () => void;
  readonly floatingWindow: (element: HTMLElement, options: FloatingWindowOptions) => void;
  readonly nextFloatingZ: () => number;
}

const MENU_IDS = ["ctx", "lctx", "cctx", "sctx", "trctx", "fxctx", "impmenu",
  "setmenu", "rowctx", "tctx", "brush-plus", "brush-menu", "font-menu",
  "brush-choice", "shape-choice", "sym-choice", "flip-choice", "center-choice",
  "zoom-choice", "pal-new-choice"] as const;

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing preserved-shell element: ${id}`);
  return found;
}

function bindOverlayDismissal(): void {
  for (const id of ["ovl", "new-ovl", "ren-ovl", "tools-ovl"] as const) {
    const overlay = element(id);
    overlay.addEventListener("click", (event) => {
      const openedAt = Number(overlay.dataset.openedAt ?? 0);
      const target = event.target as HTMLElement | null;
      if (target?.id === id && Date.now() - openedAt > 500) {
        overlay.classList.remove("on");
      }
    });
  }
  element("ovlclose").onclick = () => element("ovl").classList.remove("on");
}

function bindTransientCleanup(): void {
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node | null;
    for (const id of MENU_IDS) {
      const menu = document.getElementById(id);
      if (menu?.classList.contains("on") && target && !menu.contains(target)) {
        menu.classList.remove("on");
      }
    }
  }, true);
  window.addEventListener("blur", () => {
    document.querySelectorAll(".drag-ghost, .gal-drag-ghost, .drop-gap")
      .forEach((ghost) => ghost.remove());
    document.querySelectorAll(".dragging, .lift, .lifting, .over, .drop-into, " +
      ".drop-before, .drop-above, .drop-below").forEach((node) => node.classList.remove(
        "dragging", "lift", "lifting", "over", "drop-into", "drop-before",
        "drop-above", "drop-below"));
  });
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
    /* optional offline support must not block the editor */
  });
}

export function mountPreservedShellLayout(ports: PreservedShellLayoutPorts): void {
  ports.floatingWindow(element("palbar"), { grip: element("palgrip"),
    handle: element("palrsz"), storeKey: "palwin", clampBottom: 50,
    onClose: () => element("palbar").classList.add("closed"),
    onHeaderDblClick: resetPalette, onResize: resizePalette });
  const sidebarWidth = defaultSidebarWidth();
  resizeSidebar(sidebarWidth, defaultSidebarHeight(sidebarWidth));
  ports.floatingWindow(element("sidebar"), { grip: element("sb-grip"),
    handle: element("sb-rsz"), storeKey: "sbwin-v2", minW: 38, clampRight: 46,
    clampBottom: 60, onResize: resizeSidebar });
  element("topbar").addEventListener("pointerdown", () => {
    element("topbar").style.zIndex = String(ports.nextFloatingZ());
  }, true);
  for (const id of ["selbar", "cropbar", "rotbar"] as const) {
    const bar = document.getElementById(id);
    if (!bar) continue;
    ports.floatingWindow(bar, { grip: bar.querySelector<HTMLElement>(".crop-head") ?? bar,
      storeKey: `action-${id}`, minW: 120, minH: 44, clampBottom: 64,
      avoidOverlap: false });
  }
  for (const windowElement of document.querySelectorAll<HTMLElement>(
    ".ovl .sheet, .ovl .new-panel, .ovl .tilemap-panel")) {
    ports.floatingWindow(windowElement, { grip: windowElement.querySelector<HTMLElement>(
      ".new-head, .tilemap-head, .pop-head, h3") ?? windowElement,
    storeKey: windowElement.id ? `win-${windowElement.id}` : undefined });
  }
  bindOverlayDismissal();
  bindTransientCleanup();
  requestAnimationFrame(ports.fitView);
  registerServiceWorker();
}
