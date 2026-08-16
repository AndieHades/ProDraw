import { describe, expect, it } from "vitest";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentCompositor } from "../../src/core/editor/DocumentCompositor";

const ink = { red: 20, green: 80, blue: 200, alpha: 255 };

describe("DocumentCompositor", () => {
  it("reuses unchanged visible tiles and culls offscreen work", () => {
    const ids = ["document", "paint"];
    const document = createRasterDocument({ name: "Cache", width: 1024, height: 512,
      dpi: 72, layerName: "Paint" }, () => ids.shift() ?? "extra");
    const surface = document.editableSurface();
    surface.blendPixel(8, 8, ink);
    surface.blendPixel(780, 8, ink);
    const compositor = new DocumentCompositor();
    const view = { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };

    const first = compositor.frame(document, view, { width: 128, height: 128 });
    expect(first.tiles.map(({ x }) => x)).toEqual([0]);
    expect(compositor.metrics).toMatchObject({ composites: 1, cacheHits: 0 });
    compositor.frame(document, view, { width: 128, height: 128 });
    expect(compositor.metrics).toMatchObject({ composites: 1, cacheHits: 1 });

    surface.blendPixel(800, 20, ink);
    compositor.frame(document, view, { width: 128, height: 128 });
    expect(compositor.metrics).toMatchObject({ composites: 1, cacheHits: 2 });
    surface.blendPixel(20, 20, ink);
    compositor.frame(document, view, { width: 128, height: 128 });
    expect(compositor.metrics.composites).toBe(2);

    const panned = { ...view, offsetX: -768 };
    const offscreen = compositor.frame(document, panned, { width: 128, height: 128 });
    expect(offscreen.tiles.map(({ x }) => x)).toEqual([3]);
    expect(compositor.metrics.composites).toBe(3);
  });

  it("invalidates a tile when layer presentation changes", () => {
    const ids = ["opacity-document", "opacity-layer"];
    const document = createRasterDocument({ name: "Opacity", width: 32, height: 32,
      dpi: 72, layerName: "Paint" }, () => ids.shift() ?? "extra");
    document.editableSurface().blendPixel(2, 2, ink);
    const compositor = new DocumentCompositor();
    const view = { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };
    const initial = compositor.frame(document, view, { width: 32, height: 32 });
    document.updateLayer(document.activeLayer.descriptor.id, { opacity: 0.5 });
    const changed = compositor.frame(document, view, { width: 32, height: 32 });
    expect(changed.tiles[0]?.revision).not.toBe(initial.tiles[0]?.revision);
    expect(compositor.metrics.composites).toBe(2);
  });
});
