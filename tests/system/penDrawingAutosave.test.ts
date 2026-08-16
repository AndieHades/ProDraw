import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { ViewportPort } from "../../src/contracts/view";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { TileHistory } from "../../src/core/history/TileHistory";
import { DocumentRepository } from "../../src/core/persistence/DocumentRepository";
import { restoreDocument } from "../../src/core/persistence/documentSerialization";
import { AutosaveSystem } from "../../src/systems/autosave/AutosaveSystem";
import { DrawingSystem } from "../../src/systems/drawing/DrawingSystem";

type PointerHandler = (event: PointerEvent) => void;

class FakeCanvas {
  readonly #handlers = new Map<string, PointerHandler>();
  readonly #captured = new Set<number>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (typeof listener === "function") this.#handlers.set(type, listener as PointerHandler);
  }

  emit(type: string, event: PointerEvent): void {
    const handler = this.#handlers.get(type);
    if (!handler) throw new Error(`Missing pointer handler: ${type}`);
    handler(event);
  }

  setPointerCapture(id: number): void { this.#captured.add(id); }
  hasPointerCapture(id: number): boolean { return this.#captured.has(id); }
  releasePointerCapture(id: number): void { this.#captured.delete(id); }
  getBoundingClientRect(): DOMRect {
    return { x: 0, y: 0, left: 0, top: 0, right: 32, bottom: 32,
      width: 32, height: 32, toJSON: () => ({}) };
  }
}

class FailingRepository extends DocumentRepository {
  override saveCurrent(): Promise<void> {
    return Promise.reject(new Error("Disk write failed"));
  }
}

function penEvent(x: number, timeStamp: number, buttons: number): PointerEvent {
  return { pointerId: 17, pointerType: "pen", button: 0, buttons,
    clientX: x, clientY: 12, pressure: 0.8, tiltX: 12, tiltY: -4, timeStamp,
    preventDefault: () => undefined } as unknown as PointerEvent;
}

function hasPaint(bytes: Uint8ClampedArray | null): boolean {
  return bytes?.some((value, index) => index % 4 === 3 && value > 0) ?? false;
}

describe("pen drawing persistence", () => {
  it("commits a pen stroke to RGBA history and autosave", async () => {
    const document = createRasterDocument({ name: "Pen", width: 32, height: 32,
      dpi: 144, layerName: "Paint" }, (() => { let id = 0; return () => `pen-${++id}`; })());
    const history = new TileHistory();
    history.registerSurface(document.editableSurface());
    const repository = new DocumentRepository(new IDBFactory());
    const statuses: string[] = [];
    const autosave = new AutosaveSystem(repository, () => document,
      (status) => statuses.push(status));
    const canvas = new FakeCanvas();
    let frameRequests = 0;
    const viewport: ViewportPort = { screenToDocument: (point) => point,
      requestRender: () => { frameRequests += 1; } };
    const brush = BUNDLED_BRUSHES.find(({ name }) => name === "Base Color") ??
      BUNDLED_BRUSHES[0];
    if (!brush) throw new Error("Bundled brush fixture is unavailable");
    new DrawingSystem({ canvas: canvas as unknown as HTMLCanvasElement, viewport, history,
      getDocument: () => document, getBrush: () => brush,
      getColor: () => ({ red: 28, green: 91, blue: 214, alpha: 255 }),
      getSize: () => 8, getOpacity: () => 1, getTool: () => "brush",
      canDraw: () => true, onCommit: () => autosave.schedule(),
      onBlocked: (message) => { throw new Error(message); } }).mount();

    canvas.emit("pointerdown", penEvent(8, 10, 1));
    canvas.emit("pointermove", penEvent(14, 20, 1));
    canvas.emit("pointerup", penEvent(20, 30, 0));

    expect(history.undoCount).toBe(1);
    expect(hasPaint(document.editableSurface().copyTile(0, 0))).toBe(true);
    const committedTile = document.editableSurface().copyTile(0, 0);
    canvas.emit("pointerdown", penEvent(24, 40, 1));
    canvas.emit("pointercancel", penEvent(28, 50, 0));
    expect(document.editableSurface().copyTile(0, 0)).toEqual(committedTile);
    expect(history.undoCount).toBe(1);
    expect(frameRequests).toBeGreaterThan(0);
    history.undo();
    expect(hasPaint(document.editableSurface().copyTile(0, 0))).toBe(false);
    history.redo();
    await autosave.flush();
    const stored = await repository.loadCurrent();
    if (!stored) throw new Error("Autosave did not persist the document");
    const restored = restoreDocument(stored);
    expect(statuses).toEqual(["saving", "saved"]);
    expect(hasPaint(restored.editableSurface().copyTile(0, 0))).toBe(true);
    expect(restored.editableSurface().getPixel(12, 12).alpha).toBeGreaterThan(0);

    const failedStatuses: string[] = [];
    const failing = new AutosaveSystem(new FailingRepository(new IDBFactory()), () => document,
      (status) => failedStatuses.push(status));
    await expect(failing.flush()).rejects.toThrow("Disk write failed");
    expect(failedStatuses).toEqual(["saving", "save-failed"]);
  });
});
