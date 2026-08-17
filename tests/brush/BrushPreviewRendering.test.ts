/** @vitest-environment jsdom */
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { renderBrushPreview } from "../../src/ui/brushes/renderBrushPreview";

let rendered: number[][];
function previewHash(preview: typeof BUNDLED_BRUSHES[number]["preview"]): string {
  rendered = [];
  const canvas = document.createElement("canvas");
  renderBrushPreview(canvas, { ...BUNDLED_BRUSHES[0]!, preview });
  return createHash("sha256").update(JSON.stringify(rendered)).digest("hex");
}

describe("Brush Studio Preview renderer", () => {
  beforeEach(() => {
    vi.stubGlobal("ImageData", class TestImageData {
      constructor(readonly data: Uint8ClampedArray, readonly width: number,
        readonly height: number) {}
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      putImageData: (image: ImageData) => rendered.push([...image.data])
    } as unknown as CanvasRenderingContext2D);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("uses the shared renderer for line, size, pressure and stamp previews", () => {
    const base = BUNDLED_BRUSHES[0]!.preview;
    const hashes = [previewHash(base), previewHash({ ...base, size: 0.5 }),
      previewHash({ ...base, pressureScale: 0.25 }),
      previewHash({ ...base, stamp: true })];
    expect(new Set(hashes)).toHaveLength(hashes.length);
  });
});
