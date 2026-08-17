import { RasterSurface } from "../../core/raster/RasterSurface";

export class BrushStudioPadView {
  readonly #canvas: HTMLCanvasElement;
  #surface: RasterSurface;
  #frame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#surface = new RasterSurface("studio-pad", 640, 360);
  }

  get surface(): RasterSurface { return this.#surface; }

  resetSurface(): RasterSurface {
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    this.#frame = null;
    const width = Math.max(320, Math.round(this.#canvas.clientWidth));
    const height = Math.max(220, Math.round(this.#canvas.clientHeight));
    this.#canvas.width = width; this.#canvas.height = height;
    this.#surface = new RasterSurface("studio-pad", width, height);
    return this.#surface;
  }

  requestRender(): void {
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null; this.renderNow();
    });
  }

  renderNow(): void {
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    this.#frame = null;
    const context = this.#canvas.getContext("2d"); if (!context) return;
    context.fillStyle = "#2a2b31";
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    const tileSize = this.#surface.tileSize;
    this.#surface.visitTiles(({ x, y }, bytes) => {
      context.putImageData(new ImageData(new Uint8ClampedArray(bytes), tileSize, tileSize),
        x * tileSize, y * tileSize);
    });
  }
}
