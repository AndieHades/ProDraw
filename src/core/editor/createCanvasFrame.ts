import type { CanvasFrameViewModel } from "../../contracts/editorView";
import type { RasterDocument } from "../document/RasterDocument";
import { compositeTile, compositeTileCoordinates } from "../document/compositeTiles";

export function createCanvasFrame(document: RasterDocument): CanvasFrameViewModel {
  const tileSize = document.layers[0]?.surface.tileSize ?? 256;
  const tiles = compositeTileCoordinates(document).flatMap(({ x, y }) => {
    const bytes = compositeTile(document, x, y);
    return bytes ? [{ x, y, bytes: new Uint8ClampedArray(bytes) }] : [];
  });
  return { document: { ...document.descriptor }, tileSize, tiles };
}
