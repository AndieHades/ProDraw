import type { BrushPreset } from "../../contracts/brush";
import type { StrokeSample, StylusDiagnosticSample } from "../../contracts/stroke";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { RasterEdit } from "../../core/history/RasterEdit";
import { actualPointerEvents } from "../../core/input/actualPointerEvents";
import { RasterSurface } from "../../core/raster/RasterSurface";
import { normalizePointerPressure } from "../../logic/stroke/interpolateStroke";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";

export class BrushStudioPad {
  readonly #canvas: HTMLCanvasElement;
  readonly #getBrush: () => BrushPreset;
  readonly #onSample: (sample: StylusDiagnosticSample) => void;
  #surface = new RasterSurface("studio-pad", 640, 360);
  #edit: RasterEdit | null = null;
  #pipeline: StrokePipeline | null = null;
  #pointerId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    getBrush: () => BrushPreset,
    onSample: (sample: StylusDiagnosticSample) => void
  ) {
    this.#canvas = canvas;
    this.#getBrush = getBrush;
    this.#onSample = onSample;
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onCancel);
  }

  resetPreview(): void {
    this.resizeSurface();
    const brush = this.#getBrush();
    const edit = new RasterEdit(this.#surface, "Studio preview");
    const width = this.#surface.width;
    for (let index = 0; index <= 36; index += 1) {
      const amount = index / 36;
      renderBrushDab(edit, brush, { x: 24 + amount * (width - 48),
        y: this.#surface.height / 2 + Math.sin(amount * Math.PI * 2) * 24,
        pressure: 0.1 + amount * 0.9, tiltX: 0, tiltY: 0, time: index },
      { size: 18 + amount * 34, opacity: 1, erase: false },
      { red: 246, green: 246, blue: 249, alpha: 255 });
    }
    edit.commit();
    this.render();
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#pointerId !== null) return;
    this.#pointerId = event.pointerId;
    this.#edit = new RasterEdit(this.#surface, "Studio stroke");
    this.#pipeline = new StrokePipeline(this.#getBrush(), 34);
    this.drawSamples(this.#pipeline.push(this.sample(event)));
    this.#canvas.setPointerCapture(event.pointerId);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#pipeline) return;
    for (const pointer of actualPointerEvents(event)) {
      this.drawSamples(this.#pipeline.push(this.sample(pointer)));
    }
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit) return;
    this.onMove(event);
    this.drawSamples(this.#pipeline?.finish() ?? []);
    this.#edit.commit();
    this.#edit = null;
    this.#pipeline = null;
    this.#pointerId = null;
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId || !this.#edit) return;
    this.#edit.cancel();
    this.#edit = null;
    this.#pipeline = null;
    this.#pointerId = null;
    this.render();
  };

  private draw(sample: StrokeSample): void {
    if (!this.#edit) return;
    renderBrushDab(this.#edit, this.#getBrush(), sample,
      { size: 34, opacity: 1, erase: false },
      { red: 246, green: 246, blue: 249, alpha: 255 });
    this.render();
  }

  private drawSamples(samples: readonly StrokeSample[]): void {
    for (const sample of samples) this.draw(sample);
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

  private resizeSurface(): void {
    const width = Math.max(320, Math.round(this.#canvas.clientWidth));
    const height = Math.max(220, Math.round(this.#canvas.clientHeight));
    this.#canvas.width = width;
    this.#canvas.height = height;
    this.#surface = new RasterSurface("studio-pad", width, height);
  }

  private render(): void {
    const context = this.#canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#2a2b31";
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#surface.visitTiles(({ x, y }, bytes) => {
      context.putImageData(new ImageData(new Uint8ClampedArray(bytes), 256, 256),
        x * 256, y * 256);
    });
  }
}
