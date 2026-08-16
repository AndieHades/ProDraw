import type { LayerDescriptor } from "../../contracts/document";
import type { SerializedDocument } from "../../contracts/persistence";
import { base64ToBytes, bytesToBase64 } from "../../logic/encoding/base64Bytes";
import type { RasterDocument } from "../document/RasterDocument";
import { restoreDocument, serializeDocument } from "./documentSerialization";

interface NativeTileV1 {
  readonly x: number;
  readonly y: number;
  readonly revision?: number;
  readonly bytes: string;
}

interface NativeLayerV1 {
  readonly descriptor: LayerDescriptor;
  readonly tiles: readonly NativeTileV1[];
}

interface NativeDocumentV1 {
  readonly format: "prodraw-document";
  readonly version: 1;
  readonly descriptor: SerializedDocument["descriptor"];
  readonly activeLayerId: string;
  readonly layers: readonly NativeLayerV1[];
  readonly savedAt: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeNativeDocument(document: RasterDocument): Uint8Array<ArrayBuffer> {
  const serialized = serializeDocument(document);
  const native: NativeDocumentV1 = { format: "prodraw-document", version: 1,
    descriptor: serialized.descriptor, activeLayerId: serialized.activeLayerId,
    savedAt: serialized.savedAt,
    layers: serialized.layers.map((layer) => ({ descriptor: layer.descriptor,
      tiles: layer.tiles.map((tile) => ({ x: tile.x, y: tile.y, revision: tile.revision,
        bytes: bytesToBase64(new Uint8Array(tile.bytes)) })) })) };
  return encoder.encode(JSON.stringify(native));
}

export function decodeNativeDocument(bytes: Uint8Array<ArrayBuffer>): RasterDocument {
  const parsed = JSON.parse(decoder.decode(bytes)) as Partial<NativeDocumentV1>;
  if (parsed.format !== "prodraw-document" || parsed.version !== 1 ||
      !parsed.descriptor || typeof parsed.activeLayerId !== "string" ||
      !Array.isArray(parsed.layers) || !parsed.layers.length) {
    throw new Error("Unsupported or corrupt ProDraw document");
  }
  const layers = parsed.layers.map((layer) => {
    if (!layer?.descriptor || !Array.isArray(layer.tiles)) {
      throw new Error("Corrupt ProDraw layer");
    }
    return { descriptor: layer.descriptor,
      tiles: layer.tiles.map((tile: NativeTileV1) => {
        if (!Number.isInteger(tile.x) || !Number.isInteger(tile.y) ||
            typeof tile.bytes !== "string") throw new Error("Corrupt ProDraw tile");
        return { x: tile.x, y: tile.y, revision: tile.revision ?? 1,
          bytes: base64ToBytes(tile.bytes).buffer };
      }) };
  });
  return restoreDocument({ version: 1, descriptor: parsed.descriptor,
    activeLayerId: parsed.activeLayerId, layers,
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now() });
}
