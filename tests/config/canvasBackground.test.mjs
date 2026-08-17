import { describe, expect, it } from "vitest";
import {
  CANVAS_BACKGROUND_CHOICES, DEFAULT_CANVAS_BACKGROUND
} from "../../src/config/canvas-background.js";

describe("canvas background defaults", () => {
  it("starts new canvases with a visible white Background", () => {
    expect(DEFAULT_CANVAS_BACKGROUND).toMatchObject({
      id: "white", color: [255, 255, 255], visible: true
    });
    expect(CANVAS_BACKGROUND_CHOICES).toContain(DEFAULT_CANVAS_BACKGROUND);
  });
});
