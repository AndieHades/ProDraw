import type { PsdImportMask } from "../contracts/psdImport.ts";
import { psdMaskField } from "../logic/psd/maskAlpha.ts";

interface Bounds { minx: number; miny: number; maxx: number; maxy: number }
interface Surface {
  readonly canvas: HTMLCanvasElement;
  readonly bounds: Bounds | null;
}
interface MaskedLayer {
  readonly masks?: readonly PsdImportMask[];
  readonly psdBounds?: Readonly<{ left: number; top: number }>;
}

export const activePsdMasks = (layer: MaskedLayer): readonly PsdImportMask[] =>
  (layer.masks ?? []).filter((mask) => !mask.disabled &&
    mask.alpha?.length === mask.width * mask.height);

export function applyPsdMasks<T extends Surface>(surface: T, layer: MaskedLayer,
  dx = 0, dy = 0): T {
  const masks = activePsdMasks(layer);
  if (!surface.bounds || !masks.length) return surface;
  const context = surface.canvas.getContext("2d");
  if (!context) return surface;
  const image = context.getImageData(0, 0, surface.canvas.width, surface.canvas.height);
  for (const mask of masks) {
    const field = psdMaskField(mask, surface.bounds, layer.psdBounds, dx, dy);
    for (let index = 0; index < field.length; index++) {
      const alpha = index * 4 + 3;
      image.data[alpha] = Math.round(image.data[alpha]! * field[index]! / 255);
    }
  }
  context.putImageData(image, 0, 0); return surface;
}
