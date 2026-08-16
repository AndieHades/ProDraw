import type { RasterDocument } from "../document/RasterDocument";
import { compositeTile, compositeTileCoordinates } from "../document/compositeTiles";
import { setPngDpi } from "../../logic/png/pngDpi";
import { RASTER_LIMITS } from "../../config/raster";

export interface PngRenderOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (completed: number, total: number) => void;
}

function assertExportable(document: RasterDocument, signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("PNG export cancelled", "AbortError");
  if (document.descriptor.width * document.descriptor.height > RASTER_LIMITS.maximumPixels) {
    throw new Error("PNG export exceeds the configured pixel budget");
  }
}

const yieldToInput = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function renderDocumentPng(
  document: RasterDocument,
  options: PngRenderOptions = {}
): Promise<Uint8Array<ArrayBuffer>> {
  assertExportable(document, options.signal);
  const canvas = new OffscreenCanvas(document.descriptor.width, document.descriptor.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG renderer is unavailable");
  const tileSize = document.layers[0]?.surface.tileSize ?? 256;
  const coordinates = compositeTileCoordinates(document);
  for (const [index, coordinate] of coordinates.entries()) {
    assertExportable(document, options.signal);
    const tile = compositeTile(document, coordinate.x, coordinate.y);
    if (!tile) continue;
    context.putImageData(
      new ImageData(new Uint8ClampedArray(tile), tileSize, tileSize),
      coordinate.x * tileSize, coordinate.y * tileSize
    );
    options.onProgress?.(index + 1, coordinates.length);
    if ((index + 1) % RASTER_LIMITS.exportYieldTileInterval === 0) {
      await yieldToInput();
    }
  }
  assertExportable(document, options.signal);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return setPngDpi(new Uint8Array(await blob.arrayBuffer()), document.descriptor.dpi);
}
