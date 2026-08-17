import { clampRound } from "./math.ts";

export interface CropRect { x0: number; x1: number; y0: number; y1: number }
export interface CropDragEdges extends CropRect {
  readonly b?: boolean; readonly cx: number; readonly cy: number;
  readonly l?: boolean; readonly r?: boolean; readonly t?: boolean;
}

export function cropRatioDimensions(
  width: number, height: number, ratio: number, preferWidth: boolean, maximum: number
): { readonly height: number; readonly width: number } {
  width = clampRound(width, 1, maximum); height = clampRound(height, 1, maximum);
  if (preferWidth) height = clampRound(width / ratio, 1, maximum);
  else width = clampRound(height * ratio, 1, maximum);
  return { width, height };
}

export function cropRatioCells(
  width: number, height: number, ratio: number, preferWidth: boolean,
  cellWidth: number, cellHeight: number, maxWidth: number, maxHeight: number
): { readonly height: number; readonly width: number } {
  width = clampRound(width, 1, maxWidth); height = clampRound(height, 1, maxHeight);
  if (preferWidth) height = clampRound((width * cellWidth) / ratio / cellHeight, 1, maxHeight);
  else width = clampRound((height * cellHeight) * ratio / cellWidth, 1, maxWidth);
  return { width, height };
}

function preferWidth(crop: CropRect, drag: CropDragEdges): boolean {
  const width = crop.x1 - crop.x0 + 1, height = crop.y1 - crop.y0 + 1;
  const startWidth = drag.x1 - drag.x0 + 1, startHeight = drag.y1 - drag.y0 + 1;
  if ((drag.l || drag.r) && !(drag.t || drag.b)) return true;
  if ((drag.t || drag.b) && !(drag.l || drag.r)) return false;
  return width / startWidth >= height / startHeight;
}

export function lockCropRatio(
  crop: CropRect, drag: CropDragEdges, symmetric: boolean, ratio: number, maximum: number
): void {
  const size = cropRatioDimensions(crop.x1 - crop.x0 + 1, crop.y1 - crop.y0 + 1,
    ratio, preferWidth(crop, drag), maximum);
  const byCenterX = symmetric || !(drag.l || drag.r);
  const byCenterY = symmetric || !(drag.t || drag.b);
  crop.x0 = byCenterX ? Math.round(drag.cx - (size.width - 1) / 2) :
    drag.l ? drag.x1 - size.width + 1 : drag.x0;
  crop.y0 = byCenterY ? Math.round(drag.cy - (size.height - 1) / 2) :
    drag.t ? drag.y1 - size.height + 1 : drag.y0;
  crop.x1 = crop.x0 + size.width - 1; crop.y1 = crop.y0 + size.height - 1;
}

export function lockCellCropRatio(
  crop: CropRect, drag: CropDragEdges, symmetric: boolean, ratio: number,
  cellWidth: number, cellHeight: number, maximum: number
): void {
  const size = cropRatioCells((crop.x1 - crop.x0 + 1) / cellWidth,
    (crop.y1 - crop.y0 + 1) / cellHeight, ratio, preferWidth(crop, drag),
    cellWidth, cellHeight, Math.max(1, Math.floor(maximum / cellWidth)),
    Math.max(1, Math.floor(maximum / cellHeight)));
  const width = size.width * cellWidth, height = size.height * cellHeight;
  const byCenterX = symmetric || !(drag.l || drag.r);
  const byCenterY = symmetric || !(drag.t || drag.b);
  crop.x0 = byCenterX ? Math.round((drag.cx - (width - 1) / 2) / cellWidth) * cellWidth :
    drag.l ? crop.x1 - width + 1 : crop.x0;
  crop.y0 = byCenterY ? Math.round((drag.cy - (height - 1) / 2) / cellHeight) * cellHeight :
    drag.t ? crop.y1 - height + 1 : crop.y0;
  crop.x1 = crop.x0 + width - 1; crop.y1 = crop.y0 + height - 1;
}
