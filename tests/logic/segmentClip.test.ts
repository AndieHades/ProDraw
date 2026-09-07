import { describe, expect, it } from "vitest";
import { clipSegmentToBox } from "../../src/logic/input/segmentClip.ts";

const span = (x0: number, y0: number, x1: number, y1: number) =>
  clipSegmentToBox(x0, y0, x1, y1, 1920, 1080, 4);

describe("segment clipped to the document", () => {
  it("keeps a segment that lies inside", () => {
    expect(span(100, 100, 800, 700)).toEqual({ from: 0, to: 1 });
  });

  // Планшет позиционируется абсолютно: сэмпл может прийти за десятки тысяч
  // пикселей от предыдущего, и развернуть весь отрезок значит подвесить поток.
  it("bounds a jump far beyond the canvas to the part that lands on it", () => {
    const clipped = span(10, 500, 200_000, 500);
    if (!clipped) throw new Error("segment across the canvas must be kept");
    const covered = (clipped.to - clipped.from) * 199_990;
    expect(covered).toBeLessThan(1930);
    expect(covered).toBeGreaterThan(1900);
  });

  it("scales the covered length with the canvas, not with the jump", () => {
    const near = span(10, 500, 20_000, 500);
    const far = span(10, 500, 2_000_000, 500);
    if (!near || !far) throw new Error("both segments cross the canvas");
    expect((near.to - near.from) * 19_990).toBeCloseTo((far.to - far.from) * 1_999_990, 0);
  });

  it("drops a segment that never touches the canvas", () => {
    expect(span(-500, -500, -100, -400)).toBeNull();
    expect(span(3000, 40, 9000, 60)).toBeNull();
  });

  // Запас равен радиусу отпечатка: мазок за краем всё ещё красит холст.
  it("keeps a segment that runs just outside the edge within the margin", () => {
    expect(span(-50, 0, 50, 0)).not.toBeNull();
    expect(clipSegmentToBox(-50, -20, 50, -20, 1920, 1080, 30)).not.toBeNull();
    expect(clipSegmentToBox(-50, -20, 50, -20, 1920, 1080, 4)).toBeNull();
  });
});
