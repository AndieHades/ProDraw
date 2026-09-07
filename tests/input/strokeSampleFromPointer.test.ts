import { describe, expect, it } from "vitest";
import { POINTER_INPUT } from "../../src/config/pointer.ts";
import { pointerSampleKind,
  strokeSampleFromPointer } from "../../src/logic/input/strokeSampleFromPointer.ts";

const sample = (source: Parameters<typeof strokeSampleFromPointer>[2]) =>
  strokeSampleFromPointer(3, 4, source, POINTER_INPUT);

describe("stroke samples from pointer events", () => {
  it("carries pen pressure, tilt and time through unchanged", () => {
    expect(sample({ pointerType: "pen", pressure: 0.42, tiltX: 18, tiltY: -8,
      timeStamp: 120 })).toEqual({ x: 3, y: 4, pressure: 0.42, tiltX: 18,
      tiltY: -8, time: 120, pointerType: "pen" });
  });

  it("lifts a pen reporting no pressure at contact off zero", () => {
    expect(sample({ pointerType: "pen", pressure: 0 }).pressure)
      .toBe(POINTER_INPUT.minimumPenPressure);
    expect(sample({ pointerType: "pen", pressure: 4 }).pressure).toBe(1);
  });

  it("gives the mouse the configured pressure whatever it reports", () => {
    expect(sample({ pointerType: "mouse", pressure: 0 }).pressure)
      .toBe(POINTER_INPUT.mousePressure);
    expect(sample({ pressure: 0.3 }).pressure).toBe(POINTER_INPUT.mousePressure);
  });

  it("keeps real touch pressure and falls back when there is none", () => {
    expect(sample({ pointerType: "touch", pressure: 0.6 }).pressure).toBe(0.6);
    expect(sample({ pointerType: "touch", pressure: 0 }).pressure)
      .toBe(POINTER_INPUT.touchPressure);
  });

  it("treats missing or malformed fields as zero rather than NaN", () => {
    const result = sample({ pointerType: "pen", pressure: Number.NaN });
    expect(result.tiltX).toBe(0);
    expect(result.time).toBe(0);
    expect(result.pressure).toBe(POINTER_INPUT.minimumPenPressure);
  });

  it("maps unknown pointer types to mouse", () => {
    expect(pointerSampleKind("pen")).toBe("pen");
    expect(pointerSampleKind("touch")).toBe("touch");
    expect(pointerSampleKind(undefined)).toBe("mouse");
    expect(pointerSampleKind("gamepad")).toBe("mouse");
  });
});
