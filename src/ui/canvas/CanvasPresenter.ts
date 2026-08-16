import type { PixelCoordinate } from "../../contracts/raster";
import type { ViewState, ViewportPort } from "../../contracts/view";
import type { RasterDocument } from "../../core/document/RasterDocument";
import { compositeTile, compositeTileCoordinates } from "../../core/document/compositeTiles";
import { screenToDocument } from "../../logic/view/viewTransform";

export class CanvasPresenter implements ViewportPort {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #getDocument: () => RasterDocument;
  readonly #getView: () => ViewState;
  #frame = 0;

  constructor(
    canvas: HTMLCanvasElement,
    getDocument: () => RasterDocument,
    getView: () => ViewState
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.#canvas = canvas;
    this.#context = context;
    this.#getDocument = getDocument;
    this.#getView = getView;
  }

  get size() {
    return { width: this.#canvas.clientWidth, height: this.#canvas.clientHeight };
  }

  eventPoint(event: PointerEvent): PixelCoordinate {
    const bounds = this.#canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
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
    const document = this.#getDocument();
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
    context.fillRect(0, 0, document.descriptor.width, document.descriptor.height);
    context.shadowColor = "transparent";
    context.beginPath();
    context.rect(0, 0, document.descriptor.width, document.descriptor.height);
    context.clip();
    this.drawTiles(document, context);
    context.restore();
  }

  private drawTiles(document: RasterDocument, context: CanvasRenderingContext2D): void {
    const tileSize = document.layers[0]?.surface.tileSize ?? 256;
    for (const coordinate of compositeTileCoordinates(document)) {
      const bytes = compositeTile(document, coordinate.x, coordinate.y);
      if (!bytes) continue;
      const tile = globalThis.document.createElement("canvas");
      tile.width = tileSize;
      tile.height = tileSize;
      const tileContext = tile.getContext("2d");
      if (!tileContext) continue;
      tileContext.putImageData(
        new ImageData(new Uint8ClampedArray(bytes), tileSize, tileSize), 0, 0
      );
      context.drawImage(tile, coordinate.x * tileSize, coordinate.y * tileSize);
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
