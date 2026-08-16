import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { resolveStrokeTool } from "../../src/logic/stroke/resolveStrokeTool";

describe("resolveStrokeTool", () => {
  const stylus = { ...BUNDLED_BRUSHES[0]!.stylus,
    barrelAction: "smudge" as const, eraserAction: "eraser" as const };

  it("maps Huion barrel and eraser states through preset settings", () => {
    expect(resolveStrokeTool("brush",
      { pointerType: "pen", button: 2, buttons: 2 }, stylus)).toBe("smudge");
    expect(resolveStrokeTool("brush",
      { pointerType: "pen", button: 5, buttons: 32 }, stylus)).toBe("eraser");
  });

  it("does not reinterpret explicit tools or mouse buttons as Huion input", () => {
    expect(resolveStrokeTool("smudge",
      { pointerType: "pen", button: 5, buttons: 32 }, stylus)).toBe("smudge");
    expect(resolveStrokeTool("brush",
      { pointerType: "mouse", button: 2, buttons: 2 }, stylus)).toBe("brush");
  });
});
