// Фабрики canvas: пустой холст и «нарисуй в ImageData». Один источник вместо
// повторяющегося createElement+createImageData+putImageData по системам.
export const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
};

// canvas w×h, заполненный через колбэк fill(data) над RGBA-буфером.
// Источник пикселей (сетка/Map/список/Int32) — на вызывающем; общий тут — обвязка.
export function paintCanvas(w: number, h: number,
  fill: (data: Uint8ClampedArray) => void): HTMLCanvasElement {
  const c = makeCanvas(w, h), x = c.getContext("2d");
  if (!x) return c;
  const id = x.createImageData(w, h);
  fill(id.data); x.putImageData(id, 0, 0); return c;
}

// залить RGBA-буфер d по булевой маске mask (длина w*h) одним цветом [r,g,b,a]
export function fillMask(d: Uint8ClampedArray, mask: ArrayLike<number | boolean>,
  w: number, h: number, color: readonly number[]): void {
  const [r = 0, g = 0, b = 0, a = 255] = color;
  for (let i = 0; i < w * h; i++) if (mask[i]) {
    const o = i * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a; }
}

// подогнать буфер canvas под CSS-размер × dpr; вернуть true, если размер изменился
export function syncCanvasSize(canvas: HTMLCanvasElement, cssW: number,
  cssH: number, dpr: number): boolean {
  const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
  if (canvas.width === w && canvas.height === h) return false;
  canvas.width = w; canvas.height = h; return true;
}
