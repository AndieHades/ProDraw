export type PngDropDestination = "document" | "layer" | null;

let pending: ((value: PngDropDestination) => void) | null = null;
let boundOverlay: HTMLElement | null = null;
let keyboardBound = false;

const element = (id: string): HTMLElement | null => document.getElementById(id);

function settle(value: PngDropDestination): void {
  element("png-drop-ovl")?.classList.remove("on");
  const resolve = pending; pending = null; resolve?.(value);
}

function bind(): HTMLElement | null {
  const overlay = element("png-drop-ovl");
  if (!overlay) return null;
  if (overlay !== boundOverlay) {
    boundOverlay = overlay;
    element("png-drop-document")?.addEventListener("click", () => settle("document"));
    element("png-drop-layer")?.addEventListener("click", () => settle("layer"));
    element("png-drop-cancel")?.addEventListener("click", () => settle(null));
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay) settle(null);
    });
  }
  if (!keyboardBound) {
    keyboardBound = true;
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && pending) settle(null);
    }, true);
  }
  return overlay;
}

export function requestPngDropDestination(): Promise<PngDropDestination> {
  if (pending) settle(null);
  const overlay = bind(); if (!overlay) return Promise.resolve(null);
  overlay.classList.add("on");
  return new Promise((resolve) => { pending = resolve; });
}
