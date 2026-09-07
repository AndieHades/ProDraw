// Разбор картинки: пиксели RGBA и эвристика «это уже пиксель-арт».
import { makeCanvas } from "./canvas.ts";

type DrawableImage = CanvasImageSource & { naturalWidth: number; naturalHeight: number };

export const imageData = (im: CanvasImageSource, w: number, h: number,
  smooth: boolean): ImageData => {
  const c = makeCanvas(w, h), x = c.getContext("2d");
  if (!x) return new ImageData(Math.max(1, w), Math.max(1, h));
  x.imageSmoothingEnabled = smooth; x.drawImage(im, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
};

// мало цветов и/или маленький размер → уже пиксель-арт
export function looksPixelArt(im: DrawableImage): boolean {
  const w = im.naturalWidth, h = im.naturalHeight;
  if (Math.max(w, h) <= 96) return true;
  const SAMP = 220, k = Math.min(1, SAMP / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const d = imageData(im, sw, sh, false).data, colors = new Set<string>();
  for (let i = 0; i < d.length; i += 4) { if ((d[i + 3] ?? 0) < 8) continue;
    colors.add(((d[i] ?? 0) >> 2) + "," + ((d[i + 1] ?? 0) >> 2) + "," +
      ((d[i + 2] ?? 0) >> 2));
    if (colors.size > 180) return false; }
  return true;
}
