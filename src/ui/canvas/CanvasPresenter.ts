import type { CanvasFrameViewModel } from "../../contracts/editorView";
import type { PixelCoordinate, RasterSize } from "../../contracts/raster";
import type { StrokePreview, ViewState, ViewportPort } from "../../contracts/view";
import { RASTER_LIMITS } from "../../config/raster";
import { screenToDocument } from "../../logic/view/viewTransform";

export class CanvasPresenter implements ViewportPort {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #getFrame: (viewport: RasterSize) => CanvasFrameViewModel;
  readonly #getView: () => ViewState;
  readonly #tiles = new Map<string, { readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D; revision: number; used: number }>();
  #frame = 0;
  #use = 0;
  #strokePreview: StrokePreview | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    getFrame: (viewport: RasterSize) => CanvasFrameViewModel,
    getView: () => ViewState
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.#canvas = canvas;
    this.#context = context;
    this.#getFrame = getFrame;
    this.#getView = getView;
  }

  get size() {
    return { width: this.#canvas.clientWidth, height: this.#canvas.clientHeight };
  }

  screenToDocument(point: PixelCoordinate): PixelCoordinate {
    return screenToDocument(point, this.#getView());
  }

  requestRender(): void {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.render();
    });
  }

  setStrokePreview(preview: StrokePreview | null): void {
    this.#strokePreview = preview;
    this.requestRender();
  }

  render(): void {
    this.resizeBackingStore();
    const context = this.#context;
    const frame = this.#getFrame(this.size);
    const view = this.#getView();
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#16171b";
    context.fillRect(0, 0, this.size.width, this.size.height);
    context.save();
    context.translate(view.offsetX, view.offsetY);
    context.rotate(view.rotation);
    context.scale(view.scale, view.scale);
    context.shadowColor = "rgba(0,0,0,.45)";
    context.shadowBlur = 28 / view.scale;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, frame.document.width, frame.document.height);
    context.shadowColor = "transparent";
    context.beginPath();
    context.rect(0, 0, frame.document.width, frame.document.height);
    context.clip();
    this.drawTiles(frame, context);
    this.drawStrokePreview(context);
    context.restore();
  }

  private drawStrokePreview(context: CanvasRenderingContext2D): void {
    const preview = this.#strokePreview;
    if (!preview?.samples.length) return;
    const color = preview.color;
    context.save();
    context.globalAlpha = 0.42;
    context.strokeStyle = `rgb(${color.red} ${color.green} ${color.blue})`;
    context.fillStyle = context.strokeStyle;
    context.lineWidth = Math.max(1, preview.size);
    context.lineCap = "round"; context.lineJoin = "round";
    context.beginPath();
    const first = preview.samples[0]!;
    context.moveTo(first.x, first.y);
    for (const sample of preview.samples.slice(1)) context.lineTo(sample.x, sample.y);
    if (preview.samples.length === 1) {
      context.arc(first.x, first.y, preview.size / 2, 0, Math.PI * 2); context.fill();
    } else context.stroke();
    context.restore();
  }

  private drawTiles(frame: CanvasFrameViewModel, context: CanvasRenderingContext2D): void {
    for (const tileModel of frame.tiles) {
      const key = `${tileModel.x}:${tileModel.y}`;
      let presented = this.#tiles.get(key);
      if (!presented) {
        const canvas = globalThis.document.createElement("canvas");
        canvas.width = frame.tileSize; canvas.height = frame.tileSize;
        const tileContext = canvas.getContext("2d");
        if (!tileContext) continue;
        presented = { canvas, context: tileContext, revision: -1, used: 0 };
        this.#tiles.set(key, presented);
      }
      if (presented.revision !== tileModel.revision) {
        presented.context.putImageData(new ImageData(
          new Uint8ClampedArray(tileModel.bytes), frame.tileSize, frame.tileSize), 0, 0);
        presented.revision = tileModel.revision;
      }
      presented.used = ++this.#use;
      context.drawImage(presented.canvas,
        tileModel.x * frame.tileSize, tileModel.y * frame.tileSize);
    }
    this.trimTileCache();
  }

  private trimTileCache(): void {
    if (this.#tiles.size <= RASTER_LIMITS.maximumPresentationCacheTiles) return;
    const oldest = [...this.#tiles.entries()].sort((left, right) =>
      left[1].used - right[1].used).slice(0,
      this.#tiles.size - RASTER_LIMITS.maximumPresentationCacheTiles);
    for (const [key] of oldest) this.#tiles.delete(key);
  }

  private resizeBackingStore(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(this.#canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.#canvas.clientHeight * ratio));
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;
  }
}
