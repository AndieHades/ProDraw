import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { DrawingTool, StrokeSample } from "../../contracts/stroke";
import type { ViewportPort } from "../../contracts/view";
import { SMUDGE_DEFAULTS } from "../../config/smudge";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { RasterEdit } from "../../core/history/RasterEdit";
import type { TileHistory } from "../../core/history/TileHistory";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { renderSmudgeDab, type SmudgeState } from "../../core/brush/renderSmudgeDab";
import { actualPointerEvents } from "../../core/input/actualPointerEvents";
import { normalizePointerPressure } from "../../logic/stroke/interpolateStroke";
import { resolveStrokeTool } from "../../logic/stroke/resolveStrokeTool";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";

export interface DrawingSystemOptions {
  readonly canvas: HTMLCanvasElement;
  readonly viewport: ViewportPort;
  readonly history: TileHistory;
  readonly getDocument: () => RasterDocument;
  readonly getBrush: () => BrushPreset | LoadedBrush;
  readonly getColor: () => RgbaColor;
  readonly getSize: () => number;
  readonly getOpacity: () => number;
  readonly getTool: () => DrawingTool;
  readonly canDraw: (event: PointerEvent) => boolean;
  readonly onCommit: () => void;
  readonly onBlocked: (message: string) => void;
}

export class DrawingSystem {
  readonly #options: DrawingSystemOptions;
  #pointerId: number | null = null;
  #edit: RasterEdit | null = null;
  #pipeline: StrokePipeline | null = null;
  #strokeTool: DrawingTool = "brush";
  #smudge: SmudgeState | null = null;

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
    if (event.pointerType === "mouse" && event.button !== 0) return;
    let surface;
    try {
      surface = this.#options.getDocument().editableSurface();
    } catch (error) {
      this.#options.onBlocked(error instanceof Error ? error.message : "Layer is unavailable");
      return;
    }
    this.#pointerId = event.pointerId;
    const brush = this.#options.getBrush();
    this.#strokeTool = resolveStrokeTool(this.#options.getTool(), event, brush.stylus);
    const label = this.#strokeTool === "brush" ? "Brush stroke" :
      this.#strokeTool === "eraser" ? "Erase stroke" : "Smudge stroke";
    this.#edit = this.#options.history.begin(surface, label);
    this.#smudge = this.#strokeTool === "smudge" ? { carried: null } : null;
    this.#pipeline = new StrokePipeline(brush, this.#options.getSize());
    this.drawSamples(this.#pipeline.push(this.sample(event)));
    this.#options.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit || !this.#pipeline) return;
    for (const pointer of actualPointerEvents(event)) {
      this.drawSamples(this.#pipeline.push(this.sample(pointer)));
    }
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit) return;
    this.onPointerMove(event);
    this.drawSamples(this.#pipeline?.finish() ?? []);
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
    if (this.#strokeTool === "smudge" && this.#smudge) {
      renderSmudgeDab(this.#edit, brush, sample,
        { size: this.#options.getSize(), strength: this.#options.getOpacity(),
          ...SMUDGE_DEFAULTS }, this.#smudge);
      this.#options.viewport.requestRender();
      return;
    }
    renderBrushDab(this.#edit, brush, sample,
      { size: this.#options.getSize(), opacity: this.#options.getOpacity(),
        erase: this.#strokeTool === "eraser" },
      this.#options.getColor());
    this.#options.viewport.requestRender();
  }

  private drawSamples(samples: readonly StrokeSample[]): void {
    for (const sample of samples) this.drawSample(sample);
  }

  private sample(event: PointerEvent): StrokeSample {
    const bounds = this.#options.canvas.getBoundingClientRect();
    const point = this.#options.viewport.screenToDocument(
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    );
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
    this.#pipeline = null;
    this.#smudge = null;
  }
}
