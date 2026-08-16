import type { RasterSize } from "../../contracts/raster";
import type { ViewState } from "../../contracts/view";
import type { TileCoordinateBounds } from "../../core/document/compositeTiles";
import { screenToDocument } from "./viewTransform";

export function visibleTileBounds(
  view: ViewState,
  viewport: RasterSize,
  document: RasterSize,
  tileSize: number
): TileCoordinateBounds | null {
  const corners = [
    { x: 0, y: 0 }, { x: viewport.width, y: 0 },
    { x: 0, y: viewport.height }, { x: viewport.width, y: viewport.height }
  ].map((point) => screenToDocument(point, view));
  const minimumX = Math.min(...corners.map(({ x }) => x));
  const minimumY = Math.min(...corners.map(({ y }) => y));
  const maximumX = Math.max(...corners.map(({ x }) => x));
  const maximumY = Math.max(...corners.map(({ y }) => y));
  if (maximumX < 0 || maximumY < 0 || minimumX >= document.width ||
      minimumY >= document.height) return null;
  return {
    minimumX: Math.floor(Math.max(0, minimumX) / tileSize),
    minimumY: Math.floor(Math.max(0, minimumY) / tileSize),
    maximumX: Math.floor(Math.min(document.width - 1, maximumX) / tileSize),
    maximumY: Math.floor(Math.min(document.height - 1, maximumY) / tileSize)
  };
}
