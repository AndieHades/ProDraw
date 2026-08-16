// Растеризация замкнутого многоугольника в множество клеток выделения.
// Точки — в координатах сетки (клетка = целое). Тест по центру клетки,
// правило even-odd (scanline). Чистая логика: без DOM и без state.
export function polygonToMask(pts, W, H) {
  const set = new Set();
  if (!pts || pts.length < 3) return set;
  const n = pts.length;
  let minY = H, maxY = -1, minX = W, maxX = -1;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
  const cx0 = Math.max(0, Math.floor(minX)), cx1 = Math.min(W - 1, Math.ceil(maxX));
  for (let y = y0; y <= y1; y++) { const cy = y + 0.5, xs = [];
    for (let i = 0, j = n - 1; i < n; j = i++) { const yi = pts[i][1], yj = pts[j][1];
      if ((yi > cy) !== (yj > cy)) xs.push(pts[i][0] + (cy - yi) / (yj - yi) * (pts[j][0] - pts[i][0])); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(cx0, Math.ceil(xs[k] - 0.5)), xb = Math.min(cx1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x++) set.add(x + ',' + y); }
  }
  return set;
}
