export interface LegacyView {
  readonly zoom: number;
  readonly ox: number;
  readonly oy: number;
}

export interface ClientBounds { readonly left: number; readonly top: number }
export interface CanvasPoint { readonly x: number; readonly y: number }

export function clientToCanvas(clientX: number, clientY: number,
  bounds: ClientBounds, view: LegacyView): CanvasPoint {
  return { x: (clientX - bounds.left - view.ox) / view.zoom,
    y: (clientY - bounds.top - view.oy) / view.zoom };
}

export function zoomLegacyViewAt(view: LegacyView, point: CanvasPoint, factor: number,
  minimum: number, maximum: number): LegacyView {
  const worldX = (point.x - view.ox) / view.zoom;
  const worldY = (point.y - view.oy) / view.zoom;
  const zoom = Math.max(minimum, Math.min(maximum, view.zoom * factor));
  return { zoom, ox: point.x - worldX * zoom, oy: point.y - worldY * zoom };
}

export function resizeLegacyView(view: LegacyView, oldWidth: number, oldHeight: number,
  newWidth: number, newHeight: number, minimum: number, maximum: number): LegacyView {
  const initialZoom = Math.max(minimum, Math.min(maximum,
    Number.isFinite(view.zoom) ? view.zoom : minimum));
  const screenWidth = oldWidth * initialZoom, screenHeight = oldHeight * initialZoom;
  const centerX = view.ox + screenWidth / 2, centerY = view.oy + screenHeight / 2;
  const candidate = Math.min(screenWidth / newWidth, screenHeight / newHeight);
  const zoom = Math.max(minimum, Math.min(maximum, candidate));
  const safeZoom = Number.isFinite(zoom) ? zoom : initialZoom;
  return { zoom: safeZoom, ox: Math.round(centerX - newWidth * safeZoom / 2),
    oy: Math.round(centerY - newHeight * safeZoom / 2) };
}
