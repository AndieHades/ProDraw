/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { BrushShortcutField } from "../../src/ui/brushes/BrushShortcutField";

describe("BrushShortcutField", () => {
  it("captures physical key combos and clears them", () => {
    const input = document.createElement("input");
    const field = new BrushShortcutField(input);
    input.dispatchEvent(new KeyboardEvent("keydown", {
      code: "Digit3", ctrlKey: true, bubbles: true, cancelable: true
    }));
    expect(field.value).toBe("mod+3");
    expect(input.value).toBe("mod+3");
    input.dispatchEvent(new KeyboardEvent("keydown", {
      code: "Backspace", bubbles: true, cancelable: true
    }));
    expect(field.value).toBe("");
  });
});
