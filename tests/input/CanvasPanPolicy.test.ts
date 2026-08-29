import { describe, expect, it } from "vitest";
import { shouldStartCanvasPan } from "../../src/logic/view/CanvasPanPolicy";
import { CanvasPanSession } from "../../src/systems/viewport/CanvasPanSession";

const context = { modifierHeld: false, modeActive: true,
  modeHit: false, insideWorkArea: true };

describe("typed global canvas pan", () => {
  it("lets every mouse button pan outside the active Crop frame", () => {
    for (const button of [0, 1, 2]) expect(shouldStartCanvasPan(
      { pointerType: "mouse", button }, context)).toBe(true);
  });

  it("keeps Crop interaction inside its frame except forced navigation", () => {
    const inside = { ...context, modeHit: true };
    expect(shouldStartCanvasPan({ pointerType: "mouse", button: 0 }, inside)).toBe(false);
    expect(shouldStartCanvasPan({ pointerType: "mouse", button: 2 }, inside)).toBe(false);
    expect(shouldStartCanvasPan({ pointerType: "mouse", button: 1 }, inside)).toBe(true);
    expect(shouldStartCanvasPan({ pointerType: "pen", button: 0 },
      { ...inside, modifierHeld: true })).toBe(true);
  });

  it("updates only view coordinates after crossing the drag threshold", () => {
    const session = new CanvasPanSession(4);
    session.begin({ button: 0, clientX: 10, clientY: 20 }, { ox: 3, oy: 4 });
    expect(session.move({ clientX: 12, clientY: 21 })).toEqual({ ox: 5, oy: 5,
      moved: false });
    expect(session.move({ clientX: 20, clientY: 30 })).toEqual({ ox: 13, oy: 14,
      moved: true });
    expect(session.finish()).toEqual({ button: 0, moved: true });
  });
});
