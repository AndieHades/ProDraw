import type { SelectionRect } from "../../contracts/selection.ts";

export interface CropMode extends SelectionRect {
  idx: number;
  idy: number;
  readonly b: SelectionRect;
}

export interface CropSize { readonly width: number; readonly height: number }

export const cropSize = (crop: SelectionRect): CropSize => ({
  width: crop.x1 - crop.x0 + 1, height: crop.y1 - crop.y0 + 1
});

export function createCropMode(width: number, height: number,
  selection: SelectionRect | null | undefined): CropMode {
  const bounds = selection ? { ...selection }
    : { x0: 0, y0: 0, x1: width - 1, y1: height - 1 };
  return { ...bounds, idx: 0, idy: 0, b: { ...bounds } };
}

export function placeCropSize(crop: CropMode, width: number,
  height: number): boolean {
  const previous = cropSize(crop);
  const centerX = (crop.x0 + crop.x1) / 2, centerY = (crop.y0 + crop.y1) / 2;
  crop.x0 = Math.round(centerX - (width - 1) / 2);
  crop.y0 = Math.round(centerY - (height - 1) / 2);
  crop.x1 = crop.x0 + width - 1; crop.y1 = crop.y0 + height - 1;
  return previous.width !== width || previous.height !== height;
}

export const appliedCropRect = (crop: CropMode): SelectionRect => ({
  x0: crop.x0 - crop.idx, y0: crop.y0 - crop.idy,
  x1: crop.x1 - crop.idx, y1: crop.y1 - crop.idy
});

export function cropChangesDocument(crop: CropMode, width: number,
  height: number): boolean {
  return crop.x0 !== 0 || crop.y0 !== 0 || crop.x1 !== width - 1 ||
    crop.y1 !== height - 1 || crop.idx !== 0 || crop.idy !== 0;
}
