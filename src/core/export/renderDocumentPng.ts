import type { RasterDocument } from "../document/RasterDocument";
import { compositeTile, compositeTileCoordinates } from "../document/compositeTiles";
import { setPngDpi } from "../../logic/png/pngDpi";

export async function renderDocumentPng(
  document: RasterDocument
): Promise<Uint8Array<ArrayBuffer>> {
  const canvas = new OffscreenCanvas(document.descriptor.width, document.descriptor.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG renderer is unavailable");
  const tileSize = document.layers[0]?.surface.tileSize ?? 256;
  for (const coordinate of compositeTileCoordinates(document)) {
    const tile = compositeTile(document, coordinate.x, coordinate.y);
    if (!tile) continue;
    context.putImageData(
      new ImageData(new Uint8ClampedArray(tile), tileSize, tileSize),
      coordinate.x * tileSize, coordinate.y * tileSize
    );
  }
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return setPngDpi(new Uint8Array(await blob.arrayBuffer()), document.descriptor.dpi);
}
