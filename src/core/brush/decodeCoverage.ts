import type { CoverageMap } from "../../contracts/brush";

export async function decodeCoverage(
  bytes: Uint8Array<ArrayBuffer>,
  maximumSide = 512
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
  const data = new Uint8Array(width * height);
  for (let sourceIndex = 0, targetIndex = 0; targetIndex < data.length;
    sourceIndex += 4, targetIndex += 1) {
    const alpha = source[sourceIndex + 3] ?? 0;
    const luminance = ((source[sourceIndex] ?? 0) * 299 +
      (source[sourceIndex + 1] ?? 0) * 587 +
      (source[sourceIndex + 2] ?? 0) * 114) / 1000;
    data[targetIndex] = Math.round((luminance * alpha) / 255);
  }
  return { width, height, data };
}
