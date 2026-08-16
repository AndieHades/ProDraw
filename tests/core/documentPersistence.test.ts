import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentRepository } from "../../src/core/persistence/DocumentRepository";
import {
  restoreDocument, serializeDocument
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
});
