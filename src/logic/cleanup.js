// Чистка импортированной сетки: убрать мусор, симметрировать, обрезать поля. Чисто.
export function despeckle(g, nx, ny) { const out = g.map((r) => r.slice()), n8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { let solid = 0; const freq = new Map();
    for (const [dx, dy] of n8) { const x2 = x + dx, y2 = y + dy; if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= ny) continue; const v = g[y2][x2]; if (v) { solid++; const k = v.join(); freq.set(k, (freq.get(k) || 0) + 1); } }
    if (g[y][x] && solid <= 1) { out[y][x] = null; continue; }
    if (!g[y][x] && solid >= 7) { let bk = null, bn = 0; for (const [k, v] of freq) if (v > bn) { bn = v; bk = k; } if (bk) out[y][x] = bk.split(',').map(Number); } }
  return out; }

export function symmetrizeV(g, nx, ny) { const eq = (a, b) => (!a && !b) || (a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
  let sx = 0, n = 0; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) if (g[y][x]) { sx += x; n++; }
  const c0 = n ? sx / n : nx / 2; let twoC = Math.round(c0 * 2), best = -1;
  for (let t = Math.round((c0 - 8) * 2); t <= Math.round((c0 + 8) * 2); t++) { let m = 0, tot = 0; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const xm = t - x; if (xm <= x || xm < 0 || xm >= nx) continue; tot++; if (eq(g[y][x], g[y][xm])) m++; } if (tot && m / tot > best) { best = m / tot; twoC = t; } }
  let left = 0, right = 0; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) if (g[y][x]) { if (2 * x < twoC) left++; else if (2 * x > twoC) right++; }
  const keepLeft = left >= right, out = g.map((r) => r.slice());
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { if (keepLeft ? 2 * x > twoC : 2 * x < twoC) continue; const xm = twoC - x; if (xm >= 0 && xm < nx) out[y][xm] = g[y][x] ? g[y][x].slice() : null; }
  return out; }

export function cropEmpty(g) { if (!g.some((r) => r.some((c) => c))) return g;
  let y0 = 0, y1 = g.length - 1, x0 = 0, x1 = g[0].length - 1;
  const rowEmpty = (y) => g[y].every((c) => !c), colEmpty = (x) => g.every((r) => !r[x]);
  while (y0 < y1 && rowEmpty(y0)) y0++; while (y1 > y0 && rowEmpty(y1)) y1--;
  while (x0 < x1 && colEmpty(x0)) x0++; while (x1 > x0 && colEmpty(x1)) x1--;
  return g.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1)); }
