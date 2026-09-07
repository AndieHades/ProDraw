// Чистка импортированной сетки: убрать мусор, симметрировать, обрезать поля. Чисто.
export type CleanupCell = number[] | null;
export type CleanupGrid = CleanupCell[][];

const at = (g: CleanupGrid, x: number, y: number): CleanupCell => g[y]?.[x] ?? null;

export function despeckle(g: CleanupGrid, nx: number, ny: number): CleanupGrid {
  const out = g.map((r) => r.slice());
  const n8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let solid = 0; const freq = new Map<string, number>();
    for (const [dx, dy] of n8) {
      const x2 = x + (dx ?? 0), y2 = y + (dy ?? 0);
      if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= ny) continue;
      const v = at(g, x2, y2);
      if (v) { solid++; const k = v.join(); freq.set(k, (freq.get(k) || 0) + 1); }
    }
    const row = out[y]; if (!row) continue;
    if (at(g, x, y) && solid <= 1) { row[x] = null; continue; }
    if (!at(g, x, y) && solid >= 7) {
      let bk: string | null = null, bn = 0;
      for (const [k, v] of freq) if (v > bn) { bn = v; bk = k; }
      if (bk) row[x] = bk.split(',').map(Number);
    }
  }
  return out;
}

export function symmetrizeV(g: CleanupGrid, nx: number, ny: number): CleanupGrid {
  const eq = (a: CleanupCell, b: CleanupCell): boolean => (!a && !b) ||
    (!!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
  let sx = 0, n = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) if (at(g, x, y)) { sx += x; n++; }
  const c0 = n ? sx / n : nx / 2; let twoC = Math.round(c0 * 2), best = -1;
  for (let t = Math.round((c0 - 8) * 2); t <= Math.round((c0 + 8) * 2); t++) {
    let m = 0, tot = 0;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const xm = t - x; if (xm <= x || xm < 0 || xm >= nx) continue;
      tot++; if (eq(at(g, x, y), at(g, xm, y))) m++;
    }
    if (tot && m / tot > best) { best = m / tot; twoC = t; }
  }
  let left = 0, right = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) if (at(g, x, y)) {
    if (2 * x < twoC) left++; else if (2 * x > twoC) right++;
  }
  const keepLeft = left >= right, out = g.map((r) => r.slice());
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    if (keepLeft ? 2 * x > twoC : 2 * x < twoC) continue;
    const xm = twoC - x, row = out[y]; if (!row || xm < 0 || xm >= nx) continue;
    const cell = at(g, x, y); row[xm] = cell ? cell.slice() : null;
  }
  return out;
}

export function cropEmpty(g: CleanupGrid): CleanupGrid {
  if (!g.some((r) => r.some((c) => c))) return g;
  let y0 = 0, y1 = g.length - 1, x0 = 0, x1 = (g[0]?.length ?? 1) - 1;
  const rowEmpty = (y: number) => (g[y] ?? []).every((c) => !c);
  const colEmpty = (x: number) => g.every((r) => !r[x]);
  while (y0 < y1 && rowEmpty(y0)) y0++; while (y1 > y0 && rowEmpty(y1)) y1--;
  while (x0 < x1 && colEmpty(x0)) x0++; while (x1 > x0 && colEmpty(x1)) x1--;
  return g.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
}
