import type { DrawingTool, StrokeSample } from "../../contracts/stroke";
import type { RasterDocument } from "../../core/document/RasterDocument";
import { actualPointerEvents } from "../../core/input/actualPointerEvents";
import { pointerContact } from "../../core/input/pointerContact";
import { canPaintContact } from "../../logic/input/pointerPolicy";
import { PointerStrokeSession } from "../../logic/input/PointerStrokeSession";
import { normalizePointerPressure } from "../../logic/stroke/interpolateStroke";
import { resolveStrokeTool } from "../../logic/stroke/resolveStrokeTool";
import { ActiveRasterStroke, type DrawingStrokeOptions } from "./ActiveRasterStroke";

export interface DrawingSystemOptions extends DrawingStrokeOptions {
  readonly canvas: HTMLCanvasElement;
  readonly getDocument: () => RasterDocument;
  readonly getTool: () => DrawingTool;
  readonly canDraw: (event: PointerEvent) => boolean;
  readonly getFingerPaintEnabled?: () => boolean;
  readonly onCommit: () => void;
  readonly onBlocked: (message: string) => void;
}

export class DrawingSystem {
  readonly #options: DrawingSystemOptions;
  readonly #pointer = new PointerStrokeSession();
  #stroke: ActiveRasterStroke | null = null;

  constructor(options: DrawingSystemOptions) {
    this.#options = options;
  }

  mount(): void {
    const canvas = this.#options.canvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("lostpointercapture", this.onPointerCancel);
    if (typeof window !== "undefined") window.addEventListener("blur", this.onBlur);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  get isActive(): boolean { return this.#pointer.active !== null; }
  get activePointerKind() { return this.#pointer.active?.pointerKind ?? null; }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const contact = this.contact(event);
    if (!this.#options.canDraw(event) || !canPaintContact(contact,
      this.#options.getFingerPaintEnabled?.() ?? false)) return;
    let surface;
    try {
      surface = this.#options.getDocument().editableSurface();
    } catch (error) {
      this.#options.onBlocked(error instanceof Error ? error.message : "Layer is unavailable");
      return;
    }
    const brush = this.#options.getBrush();
    const tool = resolveStrokeTool(this.#options.getTool(), event, brush.stylus);
    if (!this.#pointer.begin(contact.id, contact.kind, tool)) return;
    this.#stroke = new ActiveRasterStroke(this.#options, surface, tool);
    this.#stroke.push(this.sample(contact));
    this.#options.viewport.setStrokePreview?.(null);
    this.#options.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.#pointer.accepts(event.pointerId) || !this.#stroke) return;
    const resolved = resolveStrokeTool(this.#options.getTool(), event,
      this.#options.getBrush().stylus);
    if (event.buttons !== 0 && this.#pointer.toolChanged(event.pointerId, resolved)) {
      this.cancelActive(); return;
    }
    for (const pointer of actualPointerEvents(event)) {
      this.#stroke.push(this.sample(this.contact(pointer)));
    }
    this.previewPredicted(event);
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.#pointer.accepts(event.pointerId) || !this.#stroke) return;
    this.onPointerMove(event);
    if (!this.#pointer.end(event.pointerId, "commit") || !this.#stroke) return;
    const changed = this.#stroke.commit();
    this.resetPointer(event.pointerId);
    if (changed) this.#options.onCommit();
    this.#options.viewport.requestRender();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (!this.#pointer.end(event.pointerId, "cancel") || !this.#stroke) return;
    this.#stroke.cancel();
    this.resetPointer(event.pointerId);
    this.#options.viewport.requestRender();
  };

  private readonly onBlur = (): void => { this.cancelActive(); };
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") this.cancelActive();
  };

  cancelActive(releaseCapture = true): void {
    const pointerId = this.#pointer.active?.pointerId;
    if (pointerId === undefined || !this.#pointer.cancel()) return;
    this.#stroke?.cancel();
    this.resetPointer(pointerId, releaseCapture);
    this.#options.viewport.requestRender();
  }

  private sample(contact: ReturnType<typeof pointerContact>): StrokeSample {
    const point = this.#options.viewport.screenToDocument(
      { x: contact.x, y: contact.y }
    );
    return { x: point.x, y: point.y,
      pressure: normalizePointerPressure(contact.pressure, contact.kind),
      tiltX: contact.tiltX, tiltY: contact.tiltY, time: contact.time };
  }

  private contact(event: PointerEvent) {
    return pointerContact(event, this.#options.canvas.getBoundingClientRect());
  }

  private previewPredicted(event: PointerEvent): void {
    const predicted = event.getPredictedEvents?.() ?? [];
    if (!predicted.length) { this.#options.viewport.setStrokePreview?.(null); return; }
    this.#options.viewport.setStrokePreview?.({
      samples: [this.sample(this.contact(event)),
        ...predicted.map((pointer) => this.sample(this.contact(pointer)))],
      size: this.#options.getSize(), color: this.#options.getColor()
    });
  }

  private resetPointer(pointerId: number, releaseCapture = true): void {
    if (releaseCapture && this.#options.canvas.hasPointerCapture(pointerId)) {
      this.#options.canvas.releasePointerCapture(pointerId);
    }
    this.#stroke = null;
    this.#options.viewport.setStrokePreview?.(null);
  }
}
