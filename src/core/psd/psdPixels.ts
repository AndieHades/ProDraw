import type { LayerMaskData, PixelArray, PixelData } from "ag-psd";
import type { PsdImportBitmap, PsdImportMask } from "../../contracts/psdImport.ts";

const byte = (data: PixelArray, index: number): number => {
  const value = data[index] ?? 0;
  if (data instanceof Uint16Array) return Math.round(value / 257);
  if (data instanceof Float32Array) return Math.round(Math.max(0, Math.min(1, value)) * 255);
  return value;
};

export function normalizeBitmap(
  image: PixelData | undefined, left = 0, top = 0
): PsdImportBitmap | undefined {
  if (!image || image.width < 1 || image.height < 1) return undefined;
  const pixels = image.width * image.height;
  if (image.data.length < pixels * 4) return undefined;
  if (image.data instanceof Uint8ClampedArray && image.data.length === pixels * 4) {
    return { left, top, width: image.width, height: image.height, rgba: image.data };
  }
  const rgba = new Uint8ClampedArray(pixels * 4);
  for (let index = 0; index < rgba.length; index += 1) {
    rgba[index] = byte(image.data, index);
  }
  return { left, top, width: image.width, height: image.height, rgba };
}

export function normalizeMask(
  source: "user" | "real", value: LayerMaskData | undefined
): PsdImportMask | undefined {
  const image = value?.imageData;
  if (!value || !image || image.width < 1 || image.height < 1) return undefined;
  const pixels = image.width * image.height;
  if (image.data.length < pixels * 4) return undefined;
  const alpha = new Uint8Array(pixels);
  for (let index = 0; index < pixels; index += 1) {
    alpha[index] = byte(image.data, index * 4);
  }
  const density = source === "user" ? value.userMaskDensity : value.vectorMaskDensity;
  const feather = source === "user" ? value.userMaskFeather : value.vectorMaskFeather;
  return { source, left: value.left ?? 0, top: value.top ?? 0,
    width: image.width, height: image.height,
    defaultAlpha: value.defaultColor ?? 255, disabled: value.disabled === true,
    relativeToLayer: value.positionRelativeToLayer === true,
    rasterizedVector: value.fromVectorData === true,
    density: Math.max(0, Math.min(1, density ?? 1)), feather: Math.max(0, feather ?? 0),
    alpha };
}
