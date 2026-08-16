import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { StrokeSample } from "../../contracts/stroke";
import type { ViewportPort } from "../../contracts/view";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { RasterEdit } from "../../core/history/RasterEdit";
import type { TileHistory } from "../../core/history/TileHistory";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import {
  interpolateStrokeSegment, normalizePointerPressure
} from "../../logic/stroke/interpolateStroke";

export interface DrawingSystemOptions {
  readonly canvas: HTMLCanvasElement;
  readonly viewport: ViewportPort;
  readonly history: TileHistory;
  readonly getDocument: () => RasterDocument;
  readonly getBrush: () => BrushPreset | LoadedBrush;
  readonly getColor: () => RgbaColor;
  readonly getSize: () => number;
  readonly getOpacity: () => number;
  readonly getTool: () => "brush" | "eraser";
  readonly canDraw: (event: PointerEvent) => boolean;
  readonly onCommit: () => void;
  readonly onBlocked: (message: string) => void;
}

export class DrawingSystem {
  readonly #options: DrawingSystemOptions;
  #pointerId: number | null = null;
  #edit: RasterEdit | null = null;
  #last: StrokeSample | null = null;
  #erase = false;

  constructor(options: DrawingSystemOptions) {
    this.#options = options;
  }

  mount(): void {
    const canvas = this.#options.canvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.#options.canDraw(event) || this.#pointerId !== null) return;
    let surface;
    try {
      surface = this.#options.getDocument().editableSurface();
    } catch (error) {
      this.#options.onBlocked(error instanceof Error ? error.message : "Layer is unavailable");
      return;
    }
    this.#pointerId = event.pointerId;
    this.#erase = this.#options.getTool() === "eraser" ||
      event.button === 5 || (event.buttons & 32) !== 0;
    this.#edit = this.#options.history.begin(surface, this.#erase ? "Erase stroke" : "Brush stroke");
    this.#last = this.sample(event);
    this.drawSample(this.#last);
    this.#options.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit || !this.#last) return;
    const coalesced = event.getCoalescedEvents?.() ?? [];
    const samples = coalesced.length ? coalesced : [event];
    for (const pointer of samples) {
      const next = this.sample(pointer);
      const brush = this.#options.getBrush();
      const spacing = Math.max(0.25, this.#options.getSize() * brush.spacing);
      for (const sample of interpolateStrokeSegment(this.#last, next, spacing)) {
        this.drawSample(sample);
      }
      this.#last = next;
    }
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit) return;
    this.onPointerMove(event);
    const changed = this.#options.history.record(this.#edit.commit());
    this.resetPointer(event.pointerId);
    if (changed) this.#options.onCommit();
    this.#options.viewport.requestRender();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit) return;
    this.#edit.cancel();
    this.resetPointer(event.pointerId);
    this.#options.viewport.requestRender();
  };

  private drawSample(sample: StrokeSample): void {
    if (!this.#edit) return;
    const brush = this.#options.getBrush();
    const scatter = brush.scatter * this.#options.getSize();
    const angle = ((Math.floor(sample.time * 10) * 1103515245) >>> 0) / 0xffffffff * Math.PI * 2;
    const radius = scatter * (((Math.floor(sample.time * 100) * 2654435761) >>> 0) / 0xffffffff);
    const scattered = { ...sample, x: sample.x + Math.cos(angle) * radius,
      y: sample.y + Math.sin(angle) * radius };
    renderBrushDab(this.#edit, brush, scattered,
      { size: this.#options.getSize(), opacity: this.#options.getOpacity(), erase: this.#erase },
      this.#options.getColor());
    this.#options.viewport.requestRender();
  }

  private sample(event: PointerEvent): StrokeSample {
    const point = this.#options.viewport.screenToDocument(this.#options.viewport.eventPoint(event));
    return { x: point.x, y: point.y,
      pressure: normalizePointerPressure(event.pressure, event.pointerType),
      tiltX: event.tiltX, tiltY: event.tiltY, time: event.timeStamp };
  }

  private resetPointer(pointerId: number): void {
    if (this.#options.canvas.hasPointerCapture(pointerId)) {
      this.#options.canvas.releasePointerCapture(pointerId);
    }
    this.#pointerId = null;
    this.#edit = null;
    this.#last = null;
  }
}
