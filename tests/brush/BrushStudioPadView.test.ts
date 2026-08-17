/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrushStudioPadView } from "../../src/ui/brushes/BrushStudioPadView";

describe("Brush Studio drawing pad presentation", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("coalesces repeated input work into one animation frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback); return callbacks.length;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("ImageData", class TestImageData {
      constructor(readonly data: Uint8ClampedArray, readonly width: number,
        readonly height: number) {}
    });
    const context = { fillRect: vi.fn(), putImageData: vi.fn(),
      set fillStyle(_value: string) { /* canvas stub */ } };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const view = new BrushStudioPadView(document.createElement("canvas"));
    view.surface.blendPixel(4, 5, { red: 255, green: 255, blue: 255, alpha: 255 });

    view.requestRender(); view.requestRender(); view.requestRender();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    callbacks[0]?.(16);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
  });
});
