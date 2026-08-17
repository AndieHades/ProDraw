import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StrokeSample, StylusDiagnosticSample } from "../../contracts/stroke";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { RasterEdit } from "../../core/history/RasterEdit";
import { actualPointerEvents } from "../../core/input/actualPointerEvents";
import { normalizePointerPressure } from "../../logic/stroke/interpolateStroke";
import { PointerStrokeSession } from "../../logic/input/PointerStrokeSession";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";
import { BrushStudioPadView } from "./BrushStudioPadView";

export class BrushStudioPad {
  readonly #canvas: HTMLCanvasElement;
  readonly #view: BrushStudioPadView;
  readonly #getBrush: () => BrushPreset | LoadedBrush;
  readonly #onSample: (sample: StylusDiagnosticSample) => void;
  #edit: RasterEdit | null = null;
  #pipeline: StrokePipeline | null = null;
  #brush: BrushPreset | LoadedBrush | null = null;
  readonly #pointer = new PointerStrokeSession();
  constructor(
    canvas: HTMLCanvasElement,
    getBrush: () => BrushPreset | LoadedBrush,
    onSample: (sample: StylusDiagnosticSample) => void
  ) {
    this.#canvas = canvas;
    this.#view = new BrushStudioPadView(canvas);
    this.#getBrush = getBrush;
    this.#onSample = onSample;
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onCancel);
    canvas.addEventListener("lostpointercapture", this.onCancel);
    window.addEventListener("blur", () => this.cancelActive());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.cancelActive();
    });
  }
  resetPreview(): void {
    const surface = this.#view.resetSurface();
    const brush = this.#getBrush();
    const edit = new RasterEdit(surface, "Studio preview");
    const width = surface.width;
    const pipeline = new StrokePipeline(brush, 52);
    for (let index = 0; index <= 36; index += 1) {
      const amount = index / 36;
      const source = { x: 24 + amount * (width - 48),
        y: surface.height / 2 + Math.sin(amount * Math.PI * 2) * 24,
        pressure: 0.1 + amount * 0.9, tiltX: 0, tiltY: 0, time: index };
      this.renderSamples(edit, brush, pipeline.push(source), 52);
    }
    this.renderSamples(edit, brush, pipeline.finish(), 52);
    edit.commit();
    this.#view.renderNow();
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.#pointer.begin(event.pointerId,
      event.pointerType === "pen" ? "pen" : event.pointerType === "touch" ? "touch" : "mouse",
      "brush")) return;
    this.#brush = this.#getBrush();
    this.#edit = new RasterEdit(this.#view.surface, "Studio stroke");
    this.#pipeline = new StrokePipeline(this.#brush, 34);
    this.drawSamples(this.#pipeline.push(this.sample(event)));
    this.#canvas.setPointerCapture(event.pointerId);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (!this.#pointer.accepts(event.pointerId) || !this.#pipeline) return;
    for (const pointer of actualPointerEvents(event)) {
      this.drawSamples(this.#pipeline.push(this.sample(pointer)));
    }
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (!this.#pointer.accepts(event.pointerId) || !this.#edit) return;
    this.onMove(event);
    if (!this.#pointer.end(event.pointerId, "commit")) return;
    this.drawSamples(this.#pipeline?.finish() ?? []);
    this.#edit.commit();
    this.#edit = null;
    this.#pipeline = null;
    this.#brush = null;
    this.release(event.pointerId);
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (!this.#pointer.end(event.pointerId, "cancel") || !this.#edit) return;
    this.#edit.cancel();
    this.#edit = null;
    this.#pipeline = null;
    this.#brush = null;
    this.release(event.pointerId);
    this.#view.requestRender();
  };

  private cancelActive(): void {
    const pointerId = this.#pointer.active?.pointerId;
    if (pointerId === undefined || !this.#pointer.cancel() || !this.#edit) return;
    this.#edit.cancel(); this.#edit = null; this.#pipeline = null; this.#brush = null;
    this.release(pointerId); this.#view.requestRender();
  }

  private drawSamples(samples: readonly StrokeSample[]): void {
    const edit = this.#edit, brush = this.#brush;
    if (!edit || !brush || !samples.length) return;
    this.renderSamples(edit, brush, samples, 34);
    this.#view.requestRender();
  }

  private renderSamples(edit: RasterEdit, brush: BrushPreset | LoadedBrush,
    samples: readonly StrokeSample[], size: number): void {
    for (const sample of samples) renderBrushDab(edit, brush, sample,
      { size, opacity: 1, erase: false },
      { red: 246, green: 246, blue: 249, alpha: 255 });
  }

  private sample(event: PointerEvent): StrokeSample {
    const bounds = this.#canvas.getBoundingClientRect();
    const sample = { x: (event.clientX - bounds.left) * this.#canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * this.#canvas.height / bounds.height,
      pressure: normalizePointerPressure(event.pressure, event.pointerType),
      tiltX: event.tiltX, tiltY: event.tiltY, time: event.timeStamp };
    this.#onSample({ ...sample, pointerType: event.pointerType,
      button: event.button, buttons: event.buttons });
    return sample;
  }

  private release(pointerId: number): void {
    if (this.#canvas.hasPointerCapture(pointerId)) this.#canvas.releasePointerCapture(pointerId);
  }

}
