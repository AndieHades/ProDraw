import { describe, expect, it } from "vitest";
import { StrokePointerSession } from "../../src/core/input/StrokePointerSession.ts";

describe("pen pressure continuity", () => {
  it("keeps no-pressure drivers usable but does not spike after real pressure", () => {
    const session = new StrokePointerSession();
    const source = { pointerType: "pen", pressure: 0, tiltX: 24, tiltY: -3 };
    expect(session.sample(1.2, 3.4, source).pressure).toBe(1);
    session.sample(2, 3, { ...source, pressure: 0.6 });
    expect(session.sample(3, 3, source).pressure).toBe(0.01);
    expect(session.sample(4.2, 3.7, source, true)).toMatchObject({
      x: 4.2, y: 3.7, pressure: 0, tiltX: 24, tiltY: -3 });
    session.reset();
    expect(session.sample(5, 3, source).pressure).toBe(1);
  });
});
