import type { TileCoordinate } from "../../contracts/raster";
import { sourceOver } from "../../logic/raster/colorComposite";
import type { RasterDocument } from "./RasterDocument";
import { parseTileKey, tileKey } from "../raster/tileAddress";

export function compositeTileCoordinates(document: RasterDocument): readonly TileCoordinate[] {
  const keys = new Set<string>();
  for (const layer of document.layers) {
    if (!layer.descriptor.visible) continue;
    layer.surface.visitTiles(({ x, y }) => keys.add(tileKey(x, y)));
  }
  return [...keys].map(parseTileKey).sort((left, right) =>
    left.y - right.y || left.x - right.x);
}

export function compositeTile(
  document: RasterDocument,
  tileX: number,
  tileY: number
): Uint8ClampedArray | null {
  const tileSize = document.layers[0]?.surface.tileSize;
  if (!tileSize) return null;
  const output = new Uint8ClampedArray(tileSize * tileSize * 4);
  let hasPixels = false;
  for (const layer of document.layers) {
    if (!layer.descriptor.visible) continue;
    const source = layer.surface.copyTile(tileX, tileY);
    if (!source) continue;
    for (let offset = 0; offset < output.length; offset += 4) {
      const alpha = source[offset + 3] ?? 0;
      if (alpha === 0) continue;
      const blended = sourceOver(
        { red: output[offset] ?? 0, green: output[offset + 1] ?? 0,
          blue: output[offset + 2] ?? 0, alpha: output[offset + 3] ?? 0 },
        { red: source[offset] ?? 0, green: source[offset + 1] ?? 0,
          blue: source[offset + 2] ?? 0, alpha },
        layer.descriptor.opacity
      );
      output[offset] = blended.red;
      output[offset + 1] = blended.green;
      output[offset + 2] = blended.blue;
      output[offset + 3] = blended.alpha;
      hasPixels ||= blended.alpha > 0;
    }
  }
  return hasPixels ? output : null;
}
