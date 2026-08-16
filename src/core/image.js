// Разбор картинки: пиксели RGBA и эвристика «это уже пиксель-арт».
import { makeCanvas } from './canvas.js';
export const imageData = (im, w, h, smooth) => { const c = makeCanvas(w, h);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = smooth; x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h); };

export function looksPixelArt(im) { // мало цветов и/или маленький размер → уже пиксель-арт
  const w = im.naturalWidth, h = im.naturalHeight;
  if (Math.max(w, h) <= 96) return true;
  const SAMP = 220, k = Math.min(1, SAMP / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const d = imageData(im, sw, sh, false).data, colors = new Set();
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue;
    colors.add((d[i] >> 2) + ',' + (d[i + 1] >> 2) + ',' + (d[i + 2] >> 2)); if (colors.size > 180) return false; }
  return true;
}
