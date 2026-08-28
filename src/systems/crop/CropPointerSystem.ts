import { cropCursor, cropHitTest, type CropHitZone } from "../../logic/cropHitTest.ts";
import { lockCellCropRatio, lockCropRatio, type CropRect } from "../../logic/cropRatio.ts";

interface CropState extends CropRect { idx: number; idy: number }
interface EdgeDrag extends CropRect, CropHitZone {
  readonly cx: number; readonly cy: number; readonly kind: "edge";
}
interface MoveDrag extends CropRect { readonly gx: number; readonly gy: number; readonly kind: "move" }
interface ImageDrag { gx: number; gy: number; readonly kind: "image" }
type CropDrag = EdgeDrag | ImageDrag | MoveDrag;

export interface CropPointerPort {
  readonly canvas: () => HTMLCanvasElement;
  readonly cells: () => boolean;
  readonly cellSize: () => { readonly height: number; readonly width: number };
  readonly clearTrim: () => void;
  readonly crop: () => CropState | null;
  readonly linked: () => boolean;
  readonly maximum: number;
  readonly ratio: () => number;
  readonly render: () => void;
  readonly symmetric: () => boolean;
  readonly syncInputs: () => void;
  readonly view: () => { readonly ox: number; readonly oy: number; readonly zoom: number };
}

export class CropPointerSystem {
  readonly #port: CropPointerPort;
  #drag: CropDrag | null = null;
  constructor(port: CropPointerPort) { this.#port = port; }

  cancel(): void { this.#drag = null; }
  end(): void { this.#drag = null; }
  hit(event: PointerEvent): boolean {
    const crop = this.#port.crop(); if (!crop) return false;
    const zone = this.hitZone(event, crop);
    return zone.inside || zone.l || zone.r || zone.t || zone.b;
  }
  hover(event: PointerEvent): void {
    const crop = this.#port.crop();
    if (!crop) return;
    this.#port.canvas().style.cursor = cropCursor(this.hitZone(event, crop));
  }

  down(event: PointerEvent): void {
    const crop = this.#port.crop();
    if (!crop) return;
    const zone = this.hitZone(event, crop);
    if (zone.l || zone.r || zone.t || zone.b) {
      this.#drag = { ...zone, kind: "edge", x0: crop.x0, y0: crop.y0,
        x1: crop.x1, y1: crop.y1, cx: (crop.x0 + crop.x1) / 2,
        cy: (crop.y0 + crop.y1) / 2 };
      return;
    }
    if (!zone.inside) { this.#drag = null; return; }
    const point = this.canvasPoint(event);
    this.#drag = event.button === 2 ? { kind: "move", x0: crop.x0, y0: crop.y0,
      x1: crop.x1, y1: crop.y1, ...point } : { kind: "image", ...point };
  }

  move(event: PointerEvent): void {
    const crop = this.#port.crop(), drag = this.#drag;
    if (!crop || !drag) return;
    this.#port.clearTrim();
    const point = this.canvasPoint(event);
    if (drag.kind === "move") this.moveFrame(crop, drag, point);
    else if (drag.kind === "image") this.moveImage(crop, drag, point);
    else this.resize(crop, drag, point, event.shiftKey);
    this.#port.syncInputs(); this.#port.render();
  }

  private canvasPoint(event: PointerEvent): { gx: number; gy: number } {
    const rect = this.#port.canvas().getBoundingClientRect(), view = this.#port.view();
    return { gx: (event.clientX - rect.left - view.ox) / view.zoom,
      gy: (event.clientY - rect.top - view.oy) / view.zoom };
  }

  private hitZone(event: PointerEvent, crop: CropState): CropHitZone {
    return cropHitTest(event.clientX, event.clientY,
      this.#port.canvas().getBoundingClientRect(), this.#port.view(), crop);
  }

  private moveFrame(crop: CropState, drag: MoveDrag, point: { gx: number; gy: number }): void {
    const dx = Math.round(point.gx - drag.gx), dy = Math.round(point.gy - drag.gy);
    crop.x0 = drag.x0 + dx; crop.x1 = drag.x1 + dx;
    crop.y0 = drag.y0 + dy; crop.y1 = drag.y1 + dy;
  }

  private moveImage(crop: CropState, drag: ImageDrag, point: { gx: number; gy: number }): void {
    const dx = Math.round(point.gx - drag.gx), dy = Math.round(point.gy - drag.gy);
    if (!dx && !dy) return;
    crop.idx += dx; crop.idy += dy; drag.gx += dx; drag.gy += dy;
  }

  private resize(crop: CropState, drag: EdgeDrag,
    point: { gx: number; gy: number }, shift: boolean): void {
    const symmetric = this.#port.symmetric() || shift;
    if (drag.l) { crop.x0 = Math.min(crop.x1, Math.round(point.gx));
      if (symmetric) crop.x1 = Math.round(2 * drag.cx - crop.x0); }
    if (drag.r) { crop.x1 = Math.max(crop.x0, Math.round(point.gx) - 1);
      if (symmetric) crop.x0 = Math.round(2 * drag.cx - crop.x1); }
    if (drag.t) { crop.y0 = Math.min(crop.y1, Math.round(point.gy));
      if (symmetric) crop.y1 = Math.round(2 * drag.cy - crop.y0); }
    if (drag.b) { crop.y1 = Math.max(crop.y0, Math.round(point.gy) - 1);
      if (symmetric) crop.y0 = Math.round(2 * drag.cy - crop.y1); }
    if (this.#port.linked()) lockCropRatio(crop, drag, symmetric,
      this.#port.ratio(), this.#port.maximum);
    this.limit(crop, drag);
    if (this.#port.cells()) this.snapCells(crop, drag, symmetric);
  }

  private limit(crop: CropState, drag: EdgeDrag): void {
    const maximum = this.#port.maximum;
    if (crop.x1 - crop.x0 + 1 > maximum) {
      if (drag.l) crop.x0 = crop.x1 - maximum + 1; else crop.x1 = crop.x0 + maximum - 1;
    }
    if (crop.y1 - crop.y0 + 1 > maximum) {
      if (drag.t) crop.y0 = crop.y1 - maximum + 1; else crop.y1 = crop.y0 + maximum - 1;
    }
  }

  private snapCells(crop: CropState, drag: EdgeDrag, symmetric: boolean): void {
    const { width, height } = this.#port.cellSize();
    if (drag.l) crop.x0 = Math.round(crop.x0 / width) * width;
    if (drag.r) crop.x1 = Math.round((crop.x1 + 1) / width) * width - 1;
    if (drag.t) crop.y0 = Math.round(crop.y0 / height) * height;
    if (drag.b) crop.y1 = Math.round((crop.y1 + 1) / height) * height - 1;
    if (crop.x1 < crop.x0) crop.x1 = crop.x0 + width - 1;
    if (crop.y1 < crop.y0) crop.y1 = crop.y0 + height - 1;
    if (this.#port.linked()) lockCellCropRatio(crop, drag, symmetric,
      this.#port.ratio(), width, height, this.#port.maximum);
  }
}
