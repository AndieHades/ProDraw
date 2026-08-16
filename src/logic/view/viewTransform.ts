import type { PixelCoordinate, RasterSize } from "../../contracts/raster";
import type { ViewState, ViewportSize } from "../../contracts/view";

export function fitView(
  documentSize: RasterSize,
  viewport: ViewportSize,
  margin = 64
): ViewState {
  const availableWidth = Math.max(1, viewport.width - margin * 2);
  const availableHeight = Math.max(1, viewport.height - margin * 2);
  const scale = Math.min(
    availableWidth / documentSize.width,
    availableHeight / documentSize.height,
    1
  );
  return {
    offsetX: viewport.width / 2 - documentSize.width * scale / 2,
    offsetY: viewport.height / 2 - documentSize.height * scale / 2,
    scale,
    rotation: 0
  };
}

export function documentToScreen(point: PixelCoordinate, view: ViewState): PixelCoordinate {
  const cosine = Math.cos(view.rotation);
  const sine = Math.sin(view.rotation);
  return {
    x: view.offsetX + (point.x * cosine - point.y * sine) * view.scale,
    y: view.offsetY + (point.x * sine + point.y * cosine) * view.scale
  };
}

export function screenToDocument(point: PixelCoordinate, view: ViewState): PixelCoordinate {
  const x = (point.x - view.offsetX) / view.scale;
  const y = (point.y - view.offsetY) / view.scale;
  const cosine = Math.cos(-view.rotation);
  const sine = Math.sin(-view.rotation);
  return { x: x * cosine - y * sine, y: x * sine + y * cosine };
}

export function zoomViewAt(
  view: ViewState,
  anchor: PixelCoordinate,
  factor: number
): ViewState {
  const documentAnchor = screenToDocument(anchor, view);
  const scale = Math.max(0.02, Math.min(32, view.scale * factor));
  const scaled = { ...view, scale };
  const movedAnchor = documentToScreen(documentAnchor, scaled);
  return { ...scaled, offsetX: scaled.offsetX + anchor.x - movedAnchor.x,
    offsetY: scaled.offsetY + anchor.y - movedAnchor.y };
}

export function rotateViewAt(
  view: ViewState,
  anchor: PixelCoordinate,
  radians: number
): ViewState {
  const documentAnchor = screenToDocument(anchor, view);
  const rotated = { ...view, rotation: view.rotation + radians };
  const movedAnchor = documentToScreen(documentAnchor, rotated);
  return { ...rotated, offsetX: rotated.offsetX + anchor.x - movedAnchor.x,
    offsetY: rotated.offsetY + anchor.y - movedAnchor.y };
}
