import type { LayerMaskData, PixelArray, PixelData } from "ag-psd";
import type { PsdImportBitmap, PsdImportMask } from "../../contracts/psdImport.ts";

const byte = (data: PixelArray, index: number): number => {
  const value = data[index] ?? 0;
  if (data instanceof Uint16Array) return Math.round(value / 257);
  if (data instanceof Float32Array) return Math.round(Math.max(0, Math.min(1, value)) * 255);
  return value;
};

export function normalizeBitmap(
  image: PixelData | undefined, left = 0, top = 0,
  trimTransparent = false, reserve: (bytes: number) => void = () => undefined
): PsdImportBitmap | undefined {
  if (!image || image.width < 1 || image.height < 1) return undefined;
  const pixels = image.width * image.height;
  if (image.data.length < pixels * 4) return undefined;
  let minX = 0, minY = 0, maxX = image.width - 1, maxY = image.height - 1;
  if (trimTransparent) {
    minX = image.width; minY = image.height; maxX = -1; maxY = -1;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      if (!byte(image.data, (y * image.width + x) * 4 + 3)) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return undefined;
  const width = maxX - minX + 1, height = maxY - minY + 1;
  reserve(width * height * 4);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = ((y + minY) * image.width + x + minX) * 4;
    const target = (y * width + x) * 4;
    for (let channel = 0; channel < 4; channel++) {
      rgba[target + channel] = byte(image.data, source + channel);
    }
  }
  return { left: left + minX, top: top + minY, width, height, rgba };
}

export function normalizeMask(
  source: "user" | "real", value: LayerMaskData | undefined,
  image: PixelData | undefined = value?.imageData,
  reserve: (bytes: number) => void = () => undefined
): PsdImportMask | undefined {
  if (!value || !image || image.width < 1 || image.height < 1) return undefined;
  const pixels = image.width * image.height;
  if (image.data.length < pixels * 4) return undefined;
  reserve(pixels);
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
