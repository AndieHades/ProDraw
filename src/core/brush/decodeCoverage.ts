import type { CoverageMap } from "../../contracts/brush";

export interface CoverageDecodeOptions {
  readonly inverted?: boolean;
  readonly contrast?: number;
  readonly brightness?: number;
}

export function coveragePixels(
  source: Uint8ClampedArray,
  options: CoverageDecodeOptions = {}
): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(source.length / 4);
  const contrast = Math.max(0, Math.min(1, options.contrast ?? 0));
  const brightness = Math.max(-1, Math.min(1, options.brightness ?? 0));
  const gain = 1 + contrast * 4;
  for (let sourceIndex = 0, targetIndex = 0; targetIndex < data.length;
    sourceIndex += 4, targetIndex += 1) {
    const alpha = source[sourceIndex + 3] ?? 0;
    const luminance = ((source[sourceIndex] ?? 0) * 299 +
      (source[sourceIndex + 1] ?? 0) * 587 +
      (source[sourceIndex + 2] ?? 0) * 114) / 1000;
    const polarity = options.inverted ? 255 - luminance : luminance;
    const adjusted = Math.max(0, Math.min(255,
      (polarity - 127.5) * gain + 127.5 + brightness * 255));
    data[targetIndex] = Math.round((adjusted * alpha) / 255);
  }
  return data;
}

export async function decodeCoverage(
  bytes: Uint8Array<ArrayBuffer>,
  maximumSide = 512,
  options: CoverageDecodeOptions = {}
): Promise<CoverageMap> {
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const scale = Math.min(1, maximumSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Brush bitmap decoder is unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const source = context.getImageData(0, 0, width, height).data;
  return { width, height, data: coveragePixels(source, options) };
}
