import type { TileCoordinate } from "../../contracts/raster";
import { sourceOverBytes } from "../../logic/raster/colorComposite";
import type { RasterDocument } from "./RasterDocument";
import { parseTileKey, tileKey } from "../raster/tileAddress";

export interface TileCoordinateBounds {
  readonly minimumX: number;
  readonly minimumY: number;
  readonly maximumX: number;
  readonly maximumY: number;
}

export function compositeTileCoordinates(document: RasterDocument,
  bounds?: TileCoordinateBounds | null): readonly TileCoordinate[] {
  const visible = document.layers.filter(({ descriptor }) => descriptor.visible);
  if (bounds) {
    const coordinates: TileCoordinate[] = [];
    for (let y = bounds.minimumY; y <= bounds.maximumY; y += 1) {
      for (let x = bounds.minimumX; x <= bounds.maximumX; x += 1) {
        if (visible.some(({ surface }) => surface.hasTile(x, y))) coordinates.push({ x, y });
      }
    }
    return coordinates;
  }
  const keys = new Set<string>();
  for (const layer of visible) {
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
  const visible = document.layers.filter(({ descriptor }) => descriptor.visible);
  if (visible.length === 1 && visible[0]?.descriptor.opacity === 1) {
    return visible[0].surface.copyTile(tileX, tileY);
  }
  let hasPixels = false;
  for (const layer of visible) {
    const source = layer.surface.copyTile(tileX, tileY);
    if (!source) continue;
    if (!hasPixels && layer.descriptor.opacity === 1) output.set(source);
    else sourceOverBytes(output, source, layer.descriptor.opacity);
    hasPixels = true;
  }
  return hasPixels ? output : null;
}
