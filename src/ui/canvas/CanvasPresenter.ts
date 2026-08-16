import type { CanvasFrameViewModel } from "../../contracts/editorView";
import type { PixelCoordinate } from "../../contracts/raster";
import type { ViewState, ViewportPort } from "../../contracts/view";
import { screenToDocument } from "../../logic/view/viewTransform";

export class CanvasPresenter implements ViewportPort {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #getFrame: () => CanvasFrameViewModel;
  readonly #getView: () => ViewState;
  #frame = 0;

  constructor(
    canvas: HTMLCanvasElement,
    getFrame: () => CanvasFrameViewModel,
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

  render(): void {
    this.resizeBackingStore();
    const context = this.#context;
    const frame = this.#getFrame();
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
    context.restore();
  }

  private drawTiles(frame: CanvasFrameViewModel, context: CanvasRenderingContext2D): void {
    for (const tileModel of frame.tiles) {
      const tile = globalThis.document.createElement("canvas");
      tile.width = frame.tileSize;
      tile.height = frame.tileSize;
      const tileContext = tile.getContext("2d");
      if (!tileContext) continue;
      tileContext.putImageData(
        new ImageData(new Uint8ClampedArray(tileModel.bytes), frame.tileSize, frame.tileSize), 0, 0
      );
      context.drawImage(tile, tileModel.x * frame.tileSize, tileModel.y * frame.tileSize);
    }
  }

  private resizeBackingStore(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(this.#canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.#canvas.clientHeight * ratio));
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;
  }
}
