// Разбор картинки: пиксели RGBA в нужном размере.
import { makeCanvas } from "./canvas.ts";

export const imageData = (im: CanvasImageSource, w: number, h: number,
  smooth: boolean): ImageData => {
  const c = makeCanvas(w, h), x = c.getContext("2d");
  if (!x) return new ImageData(Math.max(1, w), Math.max(1, h));
  x.imageSmoothingEnabled = smooth; x.drawImage(im, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
};
