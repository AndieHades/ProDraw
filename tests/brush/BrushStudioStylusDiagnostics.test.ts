/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { stylusDiagnosticText } from
  "../../src/ui/brushes/BrushStudioStylusDiagnostics";

describe("Brush Studio stylus diagnostics", () => {
  it("does not present the mouse fallback as tablet pressure", () => {
    const text = stylusDiagnosticText({ x: 0, y: 0, pressure: 1, rawPressure: 0,
      tiltX: 0, tiltY: 0, time: 0, pointerType: "mouse", button: 0, buttons: 1 });

    expect(text).toContain("mouse");
    expect(text).toContain("Windows Ink");
    expect(text).not.toContain("Pressure 1.00");
  });

  it("shows raw pressure when the browser reports a pen", () => {
    const text = stylusDiagnosticText({ x: 0, y: 0, pressure: 0.37,
      rawPressure: 0.37, tiltX: 2, tiltY: -3, time: 0, pointerType: "pen",
      button: 0, buttons: 1 });

    expect(text).toContain("pen");
    expect(text).toContain("Pressure 0.37");
  });
});
