import { requiredElement } from "../dom/query";

interface PanelPosition {
  readonly left: number;
  readonly top: number;
}

const storageKey = "prodraw.drawing-tool-panel.v1";

export class FloatingToolPanelPresenter {
  readonly #panel = requiredElement<HTMLElement>("#drawing-tool-panel");
  readonly #grip = requiredElement<HTMLElement>("#move-tool-panel");
  #pointerId: number | null = null;
  #offsetX = 0;
  #offsetY = 0;

  constructor() {
    this.restore();
    this.#grip.addEventListener("pointerdown", this.onDown);
    this.#grip.addEventListener("dblclick", () => this.reset());
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    window.addEventListener("resize", () => this.clampCurrent());
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#pointerId !== null) return;
    const bounds = this.#panel.getBoundingClientRect();
    this.#pointerId = event.pointerId;
    this.#offsetX = event.clientX - bounds.left;
    this.#offsetY = event.clientY - bounds.top;
    this.#grip.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    this.place(event.clientX - this.#offsetX, event.clientY - this.#offsetY);
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    this.#pointerId = null;
    localStorage.setItem(storageKey, JSON.stringify(this.current()));
  };

  private place(left: number, top: number): void {
    const bounds = this.#panel.getBoundingClientRect();
    const maximumLeft = Math.max(4, window.innerWidth - bounds.width - 4);
    const maximumTop = Math.max(4, window.innerHeight - bounds.height - 4);
    this.#panel.style.transform = "none";
    this.#panel.style.left = `${Math.max(4, Math.min(maximumLeft, left))}px`;
    this.#panel.style.top = `${Math.max(4, Math.min(maximumTop, top))}px`;
  }

  private current(): PanelPosition {
    const bounds = this.#panel.getBoundingClientRect();
    return { left: bounds.left, top: bounds.top };
  }

  private restore(): void {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? "null") as
        Partial<PanelPosition> | null;
      if (Number.isFinite(value?.left) && Number.isFinite(value?.top)) {
        requestAnimationFrame(() => this.place(value!.left!, value!.top!));
      }
    } catch { localStorage.removeItem(storageKey); }
  }

  private clampCurrent(): void {
    const current = this.current();
    this.place(current.left, current.top);
  }

  private reset(): void {
    localStorage.removeItem(storageKey);
    this.#panel.style.removeProperty("left");
    this.#panel.style.removeProperty("top");
    this.#panel.style.removeProperty("transform");
  }
}
