/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush";
import { BrushControlPresenter } from "../../src/ui/brushes/BrushControlPresenter";
import { testGrainMap, testShapeMap } from "./brushTestMaps";

describe("Brush Studio control surface", () => {
  beforeEach(() => {
    vi.stubGlobal("ImageData", class TestImageData {
      constructor(readonly data: Uint8ClampedArray, readonly width: number,
        readonly height: number) {}
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(), putImageData: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), fillStyle: ""
    } as unknown as CanvasRenderingContext2D);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows the resolved source and all editable Shape controls", () => {
    const base = BUNDLED_BRUSHES[0]!;
    const shapeMap = testShapeMap;
    const grainMap = testGrainMap;
    const loaded = { ...base, shape: { ...base.shape,
      sourceName: "Brush-Pocket-Brick.png", inputStyle: "azimuth" as const, count: 2 },
    grain: { ...base.grain, sourceName: "Brush-Artery-Charcoal-Corse.jpg" },
    shapeMap, nativeShapeMap: shapeMap, grainMap, nativeGrainMap: grainMap,
    compatibility: emptyBrushCompatibility(), warnings: [] };
    const host = document.createElement("section");
    const onChange = vi.fn();
    new BrushControlPresenter(host, vi.fn()).render("shape", loaded, onChange, vi.fn());
    expect(host.querySelector(".studio-source-name")?.textContent)
      .toBe("Brush-Pocket-Brick.png");
    expect(host.querySelector("canvas")?.width).toBe(32);
    expect(host.querySelectorAll(".studio-control").length).toBeGreaterThan(12);
    const count = [...host.querySelectorAll<HTMLInputElement>('input[type="range"]')]
      .find((input) => input.max === "6");
    expect(count?.value).toBe("2");
    if (!count) throw new Error("Count control missing");
    count.value = "3"; count.dispatchEvent(new Event("input"));
    expect(onChange).toHaveBeenCalledWith("shape.count", 3);
  });

  it("renders a real Preview canvas and its persisted controls", () => {
    const host = document.createElement("section");
    const brush = { ...BUNDLED_BRUSHES[0]!, preview: { stamp: true, size: 0.75,
      pressureMinimum: 0.1, pressureScale: 1.2, tiltAngle: 0.3 } };
    new BrushControlPresenter(host, vi.fn()).render("preview", brush, vi.fn(), vi.fn());
    expect(host.querySelector(".studio-preview-render")?.getAttribute("width")).toBe("180");
    expect(host.querySelectorAll(".studio-control")).toHaveLength(5);
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  });
});
