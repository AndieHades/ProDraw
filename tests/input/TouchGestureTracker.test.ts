import { describe, expect, it } from "vitest";
import { TouchGestureTracker } from "../../src/logic/view/TouchGestureTracker";

describe("TouchGestureTracker", () => {
  it("combines two-finger zoom and rotation without changing pixels", () => {
    const tracker = new TouchGestureTracker();
    const initial = { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };
    tracker.down(1, { x: 10, y: 10 });
    tracker.down(2, { x: 30, y: 10 });
    const first = tracker.move(1, { x: 10, y: 20 }, initial) ?? initial;
    const second = tracker.move(2, { x: 40, y: 30 }, first) ?? first;
    expect(second.scale).toBeGreaterThan(1);
    expect(Math.abs(second.rotation)).toBeGreaterThan(0.1);
    tracker.up(1); tracker.up(2);
    expect(tracker.pointerCount).toBe(0);
  });

  it("translates the view with a two-finger pan", () => {
    const tracker = new TouchGestureTracker();
    const initial = { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };
    tracker.down(1, { x: 10, y: 10 });
    tracker.down(2, { x: 30, y: 10 });
    const first = tracker.move(1, { x: 20, y: 20 }, initial) ?? initial;
    const second = tracker.move(2, { x: 40, y: 20 }, first) ?? first;
    expect(second.offsetX).toBeCloseTo(10, 5);
    expect(second.offsetY).toBeCloseTo(10, 5);
  });
});
