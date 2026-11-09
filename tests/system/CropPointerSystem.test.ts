import { describe, expect, it, vi } from "vitest";
import { CropPointerSystem } from "../../src/systems/crop/CropPointerSystem";

const DOC_RECT = { left: 0, top: 0 } as DOMRect;
const VIEW = { ox: 0, oy: 0, zoom: 1 };

function harness(maximum = 8192) {
  const crop = { x0: 100, y0: 100, x1: 299, y1: 199, idx: 0, idy: 0 };
  const canvas = { getBoundingClientRect: () => DOC_RECT, style: { cursor: "" } };
  const pointer = new CropPointerSystem({
    canvas: () => canvas as unknown as HTMLCanvasElement, crop: () => crop, view: () => VIEW,
    symmetric: () => false, linked: () => false, ratio: () => 1, cells: () => false,
    cellSize: () => ({ width: 1, height: 1 }), maximum, clearTrim: vi.fn(),
    syncInputs: vi.fn(), render: vi.fn()
  });
  return { crop, pointer, canvas };
}

type Mods = Partial<Pick<PointerEvent, "altKey" | "button" | "shiftKey">>;
const at = (clientX: number, clientY: number, mods: Mods = {}) =>
  ({ clientX, clientY, button: 0, shiftKey: false, altKey: false, ...mods }) as PointerEvent;

const size = (rect: { x0: number; x1: number; y0: number; y1: number }) =>
  [rect.x1 - rect.x0 + 1, rect.y1 - rect.y0 + 1];

describe("CropPointerSystem gestures", () => {
  it("moves the frame with the left button and keeps artwork in place", () => {
    const { crop, pointer } = harness();
    pointer.down(at(200, 150)); pointer.move(at(230, 170));
    expect(crop).toMatchObject({ x0: 130, y0: 120, x1: 329, y1: 219, idx: 0, idy: 0 });
  });

  it("moves artwork with the right button and keeps the frame in place", () => {
    const { crop, pointer } = harness();
    pointer.down(at(200, 150, { button: 2 })); pointer.move(at(230, 170, { button: 2 }));
    expect(crop).toMatchObject({ x0: 100, y0: 100, x1: 299, y1: 199, idx: 30, idy: 20 });
  });

  it("resizes freely from a corner without Shift", () => {
    const { crop, pointer } = harness();
    pointer.down(at(300, 200)); pointer.move(at(400, 220));
    expect(size(crop)).toEqual([300, 120]);
  });

  it("keeps the frame ratio and opposite corner on Shift corner drag", () => {
    const { crop, pointer } = harness();
    pointer.down(at(300, 200)); pointer.move(at(400, 220, { shiftKey: true }));
    expect(size(crop)).toEqual([300, 150]);
    expect(crop).toMatchObject({ x0: 100, y0: 100 });
  });

  it("scales the other axis around its centre on Shift edge drag", () => {
    const { crop, pointer } = harness();
    pointer.down(at(300, 150)); pointer.move(at(500, 150, { shiftKey: true }));
    expect(size(crop)).toEqual([400, 200]);
    expect(crop).toMatchObject({ x0: 100, y0: 50, y1: 249 });
  });

  it("restores the free shape when Shift is released during the drag", () => {
    const { crop, pointer } = harness();
    pointer.down(at(300, 150)); pointer.move(at(500, 150, { shiftKey: true }));
    pointer.move(at(500, 150));
    expect(crop).toMatchObject({ x0: 100, y0: 100, x1: 499, y1: 199 });
  });

  it("keeps the ratio when Shift reaches the maximum document side", () => {
    const { crop, pointer } = harness(400);
    pointer.down(at(300, 200)); pointer.move(at(900, 200, { shiftKey: true }));
    expect(size(crop)).toEqual([400, 200]);
  });

  it("resizes from the centre with Alt and never inverts the frame", () => {
    const { crop, pointer } = harness();
    pointer.down(at(300, 150)); pointer.move(at(320, 150, { altKey: true }));
    expect(crop).toMatchObject({ x0: 80, x1: 319 });
    pointer.move(at(50, 150, { altKey: true }));
    expect(crop.x1).toBeGreaterThanOrEqual(crop.x0);
  });

  it("offers a move zone inside a frame smaller than the edge bands", () => {
    const { crop, pointer, canvas } = harness();
    Object.assign(crop, { x0: 100, x1: 129, y0: 100, y1: 129 });
    pointer.hover(at(115, 115));
    expect(canvas.style.cursor).toBe("move");
    pointer.down(at(115, 115)); pointer.move(at(135, 115));
    expect(crop).toMatchObject({ x0: 120, x1: 149, y0: 100, y1: 129 });
  });
});
