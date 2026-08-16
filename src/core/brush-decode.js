// Декод картинки-кончика кисти в карту покрытия (0..255): яркость или альфа.
// Большие исходники (напр. 2048²) ужимаем при отрисовке до потолка стороны.
export async function blobToCoverage(blob, max = 256, alpha = false) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const cx = new OffscreenCanvas(w, h).getContext('2d');
  cx.drawImage(bmp, 0, 0, w, h); if (bmp.close) bmp.close();
  const d = cx.getImageData(0, 0, w, h).data, cov = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < cov.length; i++, j += 4)
    cov[i] = alpha ? d[j + 3] : (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000 | 0;
  return { w, h, data: cov };
}
