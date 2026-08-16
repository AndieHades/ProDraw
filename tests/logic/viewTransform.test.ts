import { describe, expect, it } from "vitest";
import {
  documentToScreen, fitView, rotateViewAt, screenToDocument, zoomViewAt
} from "../../src/logic/view/viewTransform";

describe("view transform", () => {
  it("round-trips document points without touching raster data", () => {
    const view = { offsetX: 120, offsetY: 80, scale: 0.75, rotation: Math.PI / 5 };
    const source = { x: 735.25, y: 410.5 };
    const restored = screenToDocument(documentToScreen(source, view), view);
    expect(restored.x).toBeCloseTo(source.x, 10);
    expect(restored.y).toBeCloseTo(source.y, 10);
  });

  it("keeps the cursor anchor stable across zoom and rotation", () => {
    const initial = fitView({ width: 1920, height: 1080 }, { width: 1000, height: 700 });
    const anchor = { x: 333, y: 277 };
    const documentPoint = screenToDocument(anchor, initial);
    const zoomed = zoomViewAt(initial, anchor, 1.7);
    const rotated = rotateViewAt(zoomed, anchor, Math.PI / 7);
    const finalPoint = documentToScreen(documentPoint, rotated);
    expect(finalPoint.x).toBeCloseTo(anchor.x, 10);
    expect(finalPoint.y).toBeCloseTo(anchor.y, 10);
  });
});
