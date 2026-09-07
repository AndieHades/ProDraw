// Растеризация замкнутого многоугольника в множество клеток выделения.
// Точки — в координатах сетки (клетка = целое). Тест по центру клетки,
// правило even-odd (scanline). Чистая логика: без DOM и без state.
export type MaskPoint = readonly [x: number, y: number];

export function polygonToMask(pts: readonly MaskPoint[] | null | undefined,
  W: number, H: number): Set<string> {
  const set = new Set<string>();
  if (!pts || pts.length < 3) return set;
  const n = pts.length;
  let minY = H, maxY = -1, minX = W, maxX = -1;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
  const cx0 = Math.max(0, Math.floor(minX)), cx1 = Math.min(W - 1, Math.ceil(maxX));
  for (let y = y0; y <= y1; y++) { const cy = y + 0.5, xs: number[] = [];
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const from = pts[i] as MaskPoint, to = pts[j] as MaskPoint;
      const yi = from[1], yj = to[1];
      if ((yi > cy) !== (yj > cy)) xs.push(from[0] + (cy - yi) / (yj - yi) * (to[0] - from[0]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(cx0, Math.ceil((xs[k] ?? 0) - 0.5));
      const xb = Math.min(cx1, Math.floor((xs[k + 1] ?? 0) - 0.5));
      for (let x = xa; x <= xb; x++) set.add(x + ',' + y); }
  }
  return set;
}
