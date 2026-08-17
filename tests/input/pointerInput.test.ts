import { describe, expect, it } from "vitest";
import type { PointerContact } from "../../src/contracts/pointer";
import { canNavigateTouch, canPaintContact, isPalmContact } from
  "../../src/logic/input/pointerPolicy";
import { PointerStrokeSession } from "../../src/logic/input/PointerStrokeSession";

const contact = (kind: PointerContact["kind"], width = 1): PointerContact => ({
  id: 1, kind, button: 0, buttons: 1, x: 0, y: 0, pressure: 0.5,
  tiltX: 0, tiltY: 0, width, height: width, time: 0
});

describe("pointer input policy", () => {
  it("defaults to pen/mouse painting and rejects palm contacts", () => {
    expect(canPaintContact(contact("pen"), false)).toBe(true);
    expect(canPaintContact(contact("mouse"), false)).toBe(true);
    expect(canPaintContact(contact("touch"), false)).toBe(false);
    expect(canPaintContact(contact("touch"), true)).toBe(true);
    expect(isPalmContact(contact("touch", 60))).toBe(true);
    expect(canNavigateTouch(contact("touch", 60))).toBe(false);
  });

  it("makes terminal events and tool transitions deterministic", () => {
    const session = new PointerStrokeSession();
    expect(session.begin(7, "pen", "brush")).toBe(true);
    expect(session.begin(8, "pen", "brush")).toBe(false);
    expect(session.toolChanged(7, "smudge")).toBe(true);
    expect(session.end(7, "cancel")).toBe("cancel");
    expect(session.end(7, "commit")).toBeNull();
    expect(session.cancel()).toBeNull();
  });
});
