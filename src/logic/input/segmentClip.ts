// Планшет позиционируется абсолютно: соседние сэмплы могут отстоять на весь
// экран, а при малом зуме это десятки тысяч пикселей документа. Интерполировать
// такой отрезок целиком незачем — за пределами холста отпечаток не даёт
// пикселей, зато работа растёт вместе с длиной прыжка и вешает поток.
export interface SegmentSpan { readonly from: number; readonly to: number }

// Liang–Barsky: доля отрезка, попадающая в прямоугольник документа с запасом.
export function clipSegmentToBox(x0: number, y0: number, x1: number, y1: number,
  width: number, height: number, margin: number): SegmentSpan | null {
  let from = 0, to = 1;
  const low = -margin;
  const deltas = [x1 - x0, y1 - y0];
  const starts = [x0, y0];
  const highs = [width + margin, height + margin];
  for (let axis = 0; axis < 2; axis++) {
    const delta = deltas[axis] ?? 0, start = starts[axis] ?? 0;
    const high = highs[axis] ?? 0;
    if (delta === 0) { if (start < low || start > high) return null; continue; }
    const near = (low - start) / delta, far = (high - start) / delta;
    const enter = Math.min(near, far), leave = Math.max(near, far);
    if (enter > from) from = enter;
    if (leave < to) to = leave;
    if (from > to) return null;
  }
  return { from, to };
}
