import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { TileHistory } from "../../src/core/history/TileHistory";
import { DrawingSystem } from "../../src/systems/drawing/DrawingSystem";
import type { StrokePreview } from "../../src/contracts/view";

type Handler = (event: PointerEvent) => void;
class FakeCanvas {
  readonly handlers = new Map<string, Handler>();
  readonly captured = new Set<number>();
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (typeof listener === "function") this.handlers.set(type, listener as Handler);
  }
  emit(type: string, event: PointerEvent): void { this.handlers.get(type)?.(event); }
  setPointerCapture(id: number): void { this.captured.add(id); }
  hasPointerCapture(id: number): boolean { return this.captured.has(id); }
  releasePointerCapture(id: number): void { this.captured.delete(id); }
  getBoundingClientRect(): DOMRect { return { left: 0, top: 0 } as DOMRect; }
}

const event = (kind: string, buttons: number, button = 0, x = 8) => ({ pointerId: 4,
  pointerType: kind, button, buttons, clientX: x, clientY: 8, pressure: 0.7,
  tiltX: 0, tiltY: 0, width: 10, height: 10, timeStamp: 12,
  preventDefault: () => undefined }) as unknown as PointerEvent;

function fixture(fingerPaint = false) {
  const document = createRasterDocument({ name: "Input", width: 24, height: 24,
    dpi: 72, layerName: "Paint" }, (() => { let id = 0; return () => `input-${++id}`; })());
  const history = new TileHistory(); history.registerSurface(document.editableSurface());
  const canvas = new FakeCanvas();
  const previews: Array<StrokePreview | null> = [];
  const brush = BUNDLED_BRUSHES[0]!;
  const drawing = new DrawingSystem({ canvas: canvas as unknown as HTMLCanvasElement,
    viewport: { screenToDocument: (point) => point, requestRender: () => undefined,
      setStrokePreview: (preview) => previews.push(preview) },
    history, getDocument: () => document, getBrush: () => brush,
    getColor: () => ({ red: 0, green: 0, blue: 0, alpha: 255 }),
    getSize: () => 6, getOpacity: () => 1, getTool: () => "brush",
    getFingerPaintEnabled: () => fingerPaint,
    canDraw: () => true, onCommit: () => undefined, onBlocked: () => undefined });
  drawing.mount(); return { canvas, history, drawing, document, previews };
}

describe("DrawingSystem pointer lifecycle", () => {
  it("does not paint with touch unless finger painting is explicitly enabled", () => {
    const { canvas, history } = fixture();
    canvas.emit("pointerdown", event("touch", 1));
    canvas.emit("pointerup", event("touch", 0));
    expect(history.undoCount).toBe(0);
    const enabled = fixture(true);
    enabled.canvas.emit("pointerdown", event("touch", 1));
    enabled.canvas.emit("pointerup", event("touch", 0));
    expect(enabled.history.undoCount).toBe(1);
  });

  it("cancels capture loss once and cancels a mid-stroke barrel transition", () => {
    const { canvas, history, drawing } = fixture();
    canvas.emit("pointerdown", event("pen", 1));
    canvas.emit("lostpointercapture", event("pen", 0));
    canvas.emit("pointercancel", event("pen", 0));
    expect(history.undoCount).toBe(0);
    expect(drawing.isActive).toBe(false);
    canvas.emit("pointerdown", event("pen", 1));
    canvas.emit("pointermove", event("pen", 2, 2));
    expect(drawing.isActive).toBe(false);
    expect(history.undoCount).toBe(0);
  });

  it("can yield a finger stroke without dropping capture needed by navigation", () => {
    const { canvas, history, drawing } = fixture(true);
    canvas.emit("pointerdown", event("touch", 1));
    drawing.cancelActive(false);
    expect(drawing.isActive).toBe(false);
    expect(canvas.captured.has(4)).toBe(true);
    expect(history.undoCount).toBe(0);
  });

  it("shows predicted samples only in a replaceable view overlay", () => {
    const { canvas, history, document, previews } = fixture();
    canvas.emit("pointerdown", event("pen", 1, 0, 6));
    const move = { ...event("pen", 1, 0, 10),
      getPredictedEvents: () => [event("pen", 1, 0, 20)] } as PointerEvent;
    canvas.emit("pointermove", move);
    expect(previews.at(-1)?.samples.at(-1)?.x).toBe(20);
    canvas.emit("pointerup", event("pen", 0, 0, 10));
    expect(history.undoCount).toBe(1);
    expect(document.editableSurface().getPixel(20, 8).alpha).toBe(0);
    expect(previews.at(-1)).toBeNull();
  });
});
