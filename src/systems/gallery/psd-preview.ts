import { GALLERY_PREVIEW_MAX_SIDE } from "../../config/limits.ts";
import type { PsdImportedDocument } from "../../contracts/psdImport.ts";

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = width; canvas.height = height; return canvas;
};

export function psdGalleryPreview(value: PsdImportedDocument): string | null {
  const bitmap = value.composite;
  if (!bitmap || typeof globalThis.document === "undefined") return null;
  try {
    const source = makeCanvas(value.width, value.height);
    const sourceContext = source.getContext("2d"); if (!sourceContext) return null;
    const image = sourceContext.createImageData(bitmap.width, bitmap.height);
    image.data.set(bitmap.rgba); sourceContext.putImageData(image, bitmap.left, bitmap.top);
    const scale = Math.min(1, GALLERY_PREVIEW_MAX_SIDE /
      Math.max(value.width, value.height));
    const width = Math.max(1, Math.round(value.width * scale));
    const height = Math.max(1, Math.round(value.height * scale));
    const preview = makeCanvas(width, height), context = preview.getContext("2d");
    if (!context) return null; context.imageSmoothingEnabled = true;
    context.drawImage(source, 0, 0, value.width, value.height, 0, 0, width, height);
    return preview.toDataURL("image/png");
  } catch { return null; }
}
