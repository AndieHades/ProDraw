import type { SerializedDocument, SerializedLayer } from "../../contracts/persistence";
import { RasterDocument } from "../document/RasterDocument";
import { tileKey } from "../raster/tileAddress";

interface CachedSerializedTile {
  readonly revision: number;
  readonly bytes: ArrayBuffer;
}

export class DocumentSerializer {
  readonly #tiles = new Map<string, CachedSerializedTile>();
  #documentId = "";
  #copiedTiles = 0;

  get copiedTiles(): number { return this.#copiedTiles; }

  serialize(document: RasterDocument): SerializedDocument {
    if (document.descriptor.id !== this.#documentId) {
      this.#documentId = document.descriptor.id;
      this.#tiles.clear();
    }
    const liveKeys = new Set<string>();
    const snapshot = document.snapshot();
    const layers: SerializedLayer[] = document.layers.map((layer) => {
      const tiles: SerializedLayer["tiles"][number][] = [];
      layer.surface.visitTiles(({ x, y }, bytes) => {
        const key = `${layer.surface.id}/${tileKey(x, y)}`;
        liveKeys.add(key);
        const revision = layer.surface.tileRevision(x, y);
        let cached = this.#tiles.get(key);
        if (!cached || cached.revision !== revision) {
          cached = { revision, bytes: new Uint8ClampedArray(bytes).buffer };
          this.#tiles.set(key, cached);
          this.#copiedTiles += 1;
        }
        tiles.push({ x, y, revision, bytes: cached.bytes });
      });
      return { descriptor: { ...layer.descriptor }, tiles };
    });
    for (const key of this.#tiles.keys()) if (!liveKeys.has(key)) this.#tiles.delete(key);
    return { version: 1, descriptor: { ...document.descriptor },
      activeLayerId: snapshot.activeLayerId, layers, savedAt: Date.now() };
  }
}

export function serializeDocument(document: RasterDocument): SerializedDocument {
  return new DocumentSerializer().serialize(document);
}

export function restoreDocument(record: SerializedDocument): RasterDocument {
  if (record.version !== 1 || !record.layers.length) {
    throw new Error("Unsupported or empty ProDraw document");
  }
  const document = new RasterDocument({ ...record.descriptor });
  for (const storedLayer of record.layers) {
    const layer = document.addLayer({ ...storedLayer.descriptor });
    for (const tile of storedLayer.tiles) {
      layer.surface.restoreTile(tile.x, tile.y, new Uint8ClampedArray(tile.bytes),
        tile.revision ?? 1);
    }
  }
  document.selectLayer(record.activeLayerId);
  return document;
}
