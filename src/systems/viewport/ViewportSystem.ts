import type { PixelCoordinate } from "../../contracts/raster";
import type { ViewState } from "../../contracts/view";
import { VIEW_INPUT } from "../../config/input";
import { pointerContact } from "../../core/input/pointerContact";
import { canNavigateTouch } from "../../logic/input/pointerPolicy";
import { TouchGestureTracker } from "../../logic/view/TouchGestureTracker";
import { rotateViewAt, zoomViewAt } from "../../logic/view/viewTransform";

export interface ViewportSystemOptions {
  readonly canvas: HTMLCanvasElement;
  readonly getView: () => ViewState;
  readonly setView: (view: ViewState) => void;
  readonly requestRender: () => void;
  readonly canTouchNavigate?: () => boolean;
  readonly onTouchGestureStart?: () => void;
}

export class ViewportSystem {
  readonly #options: ViewportSystemOptions;
  #space = false;
  #pointerId: number | null = null;
  #last: PixelCoordinate | null = null;
  readonly #touch = new TouchGestureTracker();

  constructor(options: ViewportSystemOptions) {
    this.#options = options;
  }

  mount(): void {
    const canvas = this.#options.canvas;
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerEnd);
    canvas.addEventListener("pointercancel", this.onPointerEnd);
    canvas.addEventListener("lostpointercapture", this.onPointerEnd);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  isPanning = (event: PointerEvent): boolean =>
    event.button === 1 || (event.button === 0 && this.#space);

  isNavigating = (event: PointerEvent): boolean => this.isPanning(event) ||
    (event.pointerType === "touch" && this.#touch.pointerCount >= 2);

  private point(event: PointerEvent): PixelCoordinate {
    const bounds = this.#options.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  private readonly onWheel = (event: WheelEvent): void => {
    const point = this.point(event as unknown as PointerEvent);
    const view = event.altKey
      ? rotateViewAt(this.#options.getView(), point, event.deltaY * -VIEW_INPUT.wheelRotationRate)
      : zoomViewAt(this.#options.getView(), point,
        Math.exp(event.deltaY * -VIEW_INPUT.wheelZoomRate));
    this.#options.setView(view);
    this.#options.requestRender();
    event.preventDefault();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "touch") {
      const contact = pointerContact(event, this.#options.canvas.getBoundingClientRect());
      if (!canNavigateTouch(contact) || this.#options.canTouchNavigate?.() === false) return;
      this.#touch.down(event.pointerId, { x: contact.x, y: contact.y });
      this.#options.canvas.setPointerCapture(event.pointerId);
      if (this.#touch.pointerCount === 2) this.#options.onTouchGestureStart?.();
      event.preventDefault(); return;
    }
    if (!this.isPanning(event) || this.#pointerId !== null) return;
    this.#pointerId = event.pointerId;
    this.#last = this.point(event);
    this.#options.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === "touch" && this.#touch.has(event.pointerId)) {
      const next = this.#touch.move(event.pointerId, this.point(event), this.#options.getView());
      if (next) { this.#options.setView(next); this.#options.requestRender(); }
      event.preventDefault(); return;
    }
    if (event.pointerId !== this.#pointerId || !this.#last) return;
    const next = this.point(event);
    const view = this.#options.getView();
    this.#options.setView({ ...view,
      offsetX: view.offsetX + next.x - this.#last.x,
      offsetY: view.offsetY + next.y - this.#last.y });
    this.#last = next;
    this.#options.requestRender();
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (this.#touch.has(event.pointerId)) {
      this.#touch.up(event.pointerId);
      this.release(event.pointerId);
      return;
    }
    if (event.pointerId !== this.#pointerId) return;
    this.#pointerId = null;
    this.#last = null;
    this.release(event.pointerId);
  };

  private readonly onBlur = (): void => {
    this.#pointerId = null; this.#last = null; this.#touch.reset(); this.#space = false;
  };
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") this.onBlur();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === VIEW_INPUT.panKeyCode && !event.repeat) this.#space = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === VIEW_INPUT.panKeyCode) this.#space = false;
  };

  private release(pointerId: number): void {
    if (this.#options.canvas.hasPointerCapture(pointerId)) {
      this.#options.canvas.releasePointerCapture(pointerId);
    }
  }
}
