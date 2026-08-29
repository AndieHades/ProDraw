import type { GalleryImportStage } from "../../config/import-progress.ts";

export interface GalleryImportProgressPort { stage(value: GalleryImportStage): void }

export interface DecodedImage { readonly naturalWidth: number; readonly naturalHeight: number }
export interface DecodedPixels { readonly width: number; readonly height: number;
  readonly data: Uint8ClampedArray }
export interface GalleryImageImportPorts<TImage extends DecodedImage = DecodedImage> {
  readonly decodeImage: (file: File) => Promise<TImage>;
  readonly imageData: (image: TImage, width: number, height: number,
    smooth: boolean) => DecodedPixels;
  readonly looksPixelArt: (image: TImage) => boolean;
  readonly newWorkFromImage: (width: number, height: number, data: Uint8ClampedArray,
    name: string, format: string | null, location: string | null) => Promise<boolean>;
  readonly beginConvertedWork: () => void;
  readonly openConverter: (file: File) => void;
  readonly onOpened: () => void;
}
export type GalleryImageImportResult = "opened" | "converted" | "save-failed" |
  "decode-failed";
export const isPngImageFile = (file: File): boolean =>
  file.type.toLowerCase() === "image/png" || /\.png$/i.test(file.name);
const documentName = (name: string): string => name.replace(/\.\w+$/, "");

export function decodeImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(), url = URL.createObjectURL(file);
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image decode failed")); };
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.src = url;
  });
}
export async function runGalleryImageImport<TImage extends DecodedImage>(file: File,
  sourceLocation: string | null, progress: GalleryImportProgressPort | null,
  ports: GalleryImageImportPorts<TImage>): Promise<GalleryImageImportResult> {
  progress?.stage("decoding");
  try {
    const image = await ports.decodeImage(file); progress?.stage("preparing");
    if (isPngImageFile(file) || ports.looksPixelArt(image)) {
      const pixels = ports.imageData(image, image.naturalWidth, image.naturalHeight, false);
      progress?.stage("saving"); const png = isPngImageFile(file);
      const opened = await ports.newWorkFromImage(pixels.width, pixels.height, pixels.data,
        documentName(file.name), png ? "png" : null, png ? sourceLocation : null);
      if (!opened) return "save-failed";
      progress?.stage("opening"); ports.onOpened(); return "opened";
    }
    ports.beginConvertedWork(); ports.openConverter(file); return "converted";
  } catch { return "decode-failed"; }
}
