import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentRepository } from "../../src/core/persistence/DocumentRepository";
import {
  DocumentSerializer, restoreDocument, serializeDocument
} from "../../src/core/persistence/documentSerialization";

describe("raster document persistence", () => {
  it("round-trips layer metadata and exact allocated tile bytes", () => {
    let id = 0;
    const document = createRasterDocument({
      name: "Artwork", width: 4096, height: 4096, dpi: 300, layerName: "Paint"
    }, () => `id-${id += 1}`);
    document.editableSurface().blendPixel(300, 600,
      { red: 13, green: 91, blue: 207, alpha: 173 });
    const restored = restoreDocument(serializeDocument(document));
    expect(restored.snapshot()).toEqual(document.snapshot());
    expect(restored.editableSurface().getPixel(300, 600)).toEqual(
      document.editableSurface().getPixel(300, 600));
    expect(restored.editableSurface().allocatedTileCount).toBe(1);
  });

  it("stores and removes the current document atomically", async () => {
    const repository = new DocumentRepository(indexedDB);
    const document = createRasterDocument({
      name: "Saved", width: 64, height: 64, dpi: 72, layerName: "Paint"
    }, (() => { let id = 0; return () => `repo-${id += 1}`; })());
    await repository.saveCurrent(serializeDocument(document));
    expect((await repository.loadCurrent())?.descriptor.name).toBe("Saved");
    await repository.clearCurrent();
    expect(await repository.loadCurrent()).toBeNull();
  });

  it("copies only tiles whose surface revision changed", () => {
    const document = createRasterDocument({ name: "Cached", width: 512, height: 256,
      dpi: 72, layerName: "Paint" }, (() => { let id = 0; return () => `cache-${++id}`; })());
    const serializer = new DocumentSerializer();
    document.editableSurface().blendPixel(2, 2,
      { red: 1, green: 2, blue: 3, alpha: 255 });
    serializer.serialize(document);
    expect(serializer.copiedTiles).toBe(1);
    serializer.serialize(document);
    expect(serializer.copiedTiles).toBe(1);
    document.editableSurface().blendPixel(300, 2,
      { red: 4, green: 5, blue: 6, alpha: 255 });
    serializer.serialize(document);
    expect(serializer.copiedTiles).toBe(2);
  });

  it("abandons a chunked snapshot when pixels change between chunks", async () => {
    const document = createRasterDocument({ name: "Chunked", width: 1280, height: 256,
      dpi: 72, layerName: "Paint" }, (() => { let id = 0; return () => `chunk-${++id}`; })());
    const surface = document.editableSurface();
    for (let tile = 0; tile < 5; tile += 1) {
      surface.blendPixel(tile * surface.tileSize, 0,
        { red: 10, green: 20, blue: 30, alpha: 255 });
    }
    const serializer = new DocumentSerializer();
    const pending = serializer.serializeAsync(document);
    surface.blendPixel(1, 1, { red: 200, green: 100, blue: 50, alpha: 255 });
    expect(await pending).toBeNull();
    expect(await serializer.serializeAsync(document)).not.toBeNull();
  });
});
