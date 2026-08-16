import type { SerializedDocument, SerializedLayer } from "../../contracts/persistence";
import { RasterDocument } from "../document/RasterDocument";

export function serializeDocument(document: RasterDocument): SerializedDocument {
  const snapshot = document.snapshot();
  const layers: SerializedLayer[] = document.layers.map((layer) => {
    const tiles: SerializedLayer["tiles"][number][] = [];
    layer.surface.visitTiles(({ x, y }, bytes) => {
      tiles.push({ x, y, bytes: new Uint8ClampedArray(bytes).buffer });
    });
    return { descriptor: { ...layer.descriptor }, tiles };
  });
  return { version: 1, descriptor: { ...document.descriptor },
    activeLayerId: snapshot.activeLayerId, layers, savedAt: Date.now() };
}

export function restoreDocument(record: SerializedDocument): RasterDocument {
  if (record.version !== 1 || !record.layers.length) {
    throw new Error("Unsupported or empty ProDraw document");
  }
  const document = new RasterDocument({ ...record.descriptor });
  for (const storedLayer of record.layers) {
    const layer = document.addLayer({ ...storedLayer.descriptor });
    for (const tile of storedLayer.tiles) {
      layer.surface.replaceTile(tile.x, tile.y, new Uint8ClampedArray(tile.bytes));
    }
  }
  document.selectLayer(record.activeLayerId);
  return document;
}
