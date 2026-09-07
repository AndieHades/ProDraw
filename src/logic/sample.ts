// Дискретизация картинки в сетку клеток-«пикселей». Чисто: на входе {w,h,ch,data}.
export interface SampleImage {
  readonly w: number;
  readonly h: number;
  readonly ch: number;
  readonly data: Uint8ClampedArray | readonly number[];
}
export type SampleCell = number[] | null;
export interface SampledGrid {
  readonly grid: SampleCell[][];
  readonly samples: number[][];
  readonly nx: number;
  readonly ny: number;
}

const at = (im: SampleImage, x: number, y: number): number[] => {
  const i = (y * im.w + x) * im.ch;
  return [im.data[i] ?? 0, im.data[i + 1] ?? 0, im.data[i + 2] ?? 0];
};
const alphaAt = (im: SampleImage, x: number, y: number): number =>
  im.ch > 3 ? im.data[(y * im.w + x) * im.ch + 3] ?? 255 : 255;

function edgeEnergy(im: SampleImage, axis: 0 | 1): Float64Array {
  const n = axis === 0 ? im.w : im.h, m = axis === 0 ? im.h : im.w;
  const e = new Float64Array(n);
  for (let i = 1; i < n; i++) { let s = 0;
    for (let j = 0; j < m; j += 2) {
      const a = axis === 0 ? at(im, i, j) : at(im, j, i);
      const b = axis === 0 ? at(im, i - 1, j) : at(im, j, i - 1);
      s += Math.abs((a[0] ?? 0) - (b[0] ?? 0)) + Math.abs((a[1] ?? 0) - (b[1] ?? 0)) +
        Math.abs((a[2] ?? 0) - (b[2] ?? 0)); }
    e[i] = s; }
  return e;
}

// период решётки апскейленного пиксель-арта: автокорреляция энергии граней (2..40)
function detectPeriod(e: Float64Array): number {
  const score = (lag: number): number => { let s = 0;
    for (let i = 0; i + lag < e.length; i++) s += (e[i] ?? 0) * (e[i + lag] ?? 0);
    return s / (e.length - lag); };
  let best = 8, bv = -1;
  for (let lag = 4; lag <= 40; lag++) { const s = score(lag); if (s > bv) { bv = s; best = lag; } }
  // максимум бывает на кратном периоде (гармонике) — тогда клетка вдвое-втрое крупнее
  // настоящей и детали теряются; наименьший лаг с почти пиковой автокорреляцией —
  // настоящий период, дробную точность берём делением главного пика
  for (let lag = 4; lag < best; lag++) if (score(lag) >= bv * 0.85) return best / Math.round(best / lag);
  return best;
}

// доминирующий цвет клетки; прозрачные пиксели не учитываем, клетка прозрачна
// при большинстве прозрачных — точный вырез по альфе исходника
function cellColor(im: SampleImage, x0: number, y0: number, x1: number,
  y1: number): SampleCell {
  const freq = new Map<number, number[]>();
  const xs = Math.floor(x0), xe = Math.max(xs + 1, Math.floor(x1));
  const ys = Math.floor(y0), ye = Math.max(ys + 1, Math.floor(y1));
  let opaque = 0, total = 0;
  for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { total++;
    if (alphaAt(im, x, y) < 128) continue; opaque++;
    const c = at(im, x, y);
    const k = (((c[0] ?? 0) >> 3) << 10) | (((c[1] ?? 0) >> 3) << 5) | ((c[2] ?? 0) >> 3);
    let e = freq.get(k); if (!e) { e = [0, 0, 0, 0]; freq.set(k, e); }
    e[0] = (e[0] ?? 0) + (c[0] ?? 0); e[1] = (e[1] ?? 0) + (c[1] ?? 0);
    e[2] = (e[2] ?? 0) + (c[2] ?? 0); e[3] = (e[3] ?? 0) + 1; }
  if (opaque * 2 < total) return null;
  let best = [0, 0, 0, 1], bn = -1;
  for (const e of freq.values()) if ((e[3] ?? 0) > bn) { bn = e[3] ?? 0; best = e; }
  const count = best[3] || 1;
  return [Math.round((best[0] ?? 0) / count), Math.round((best[1] ?? 0) / count),
    Math.round((best[2] ?? 0) / count)];
}

// заливка фона от краёв; прозрачные клетки (null) — всегда фон
function floodBackground(g: SampleCell[][], nx: number, ny: number,
  bgTol: number): boolean[][] {
  const bg = g[0]?.[0] ?? null, tol2 = bgTol * bgTol;
  const near = (c: SampleCell): boolean => !c || (bg
    ? ((c[0] ?? 0) - (bg[0] ?? 0)) ** 2 + ((c[1] ?? 0) - (bg[1] ?? 0)) ** 2 +
      ((c[2] ?? 0) - (bg[2] ?? 0)) ** 2 < tol2 : false);
  const isBg = Array.from({ length: ny }, () => new Array<boolean>(nx).fill(false));
  const st: [number, number][] = [];
  for (let x = 0; x < nx; x++) st.push([x, 0], [x, ny - 1]);
  for (let y = 0; y < ny; y++) st.push([0, y], [nx - 1, y]);
  while (st.length) { const [x, y] = st.pop() as [number, number];
    if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
    const row = isBg[y]; if (!row || row[x] || !near(g[y]?.[x] ?? null)) continue;
    row[x] = true; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  return isBg;
}

export function sampleGrid(im: SampleImage, cell: number | null | undefined,
  bgTol: number): SampledGrid {
  let cw: number, ch: number;
  if (cell) { cw = cell; ch = cell; }
  else if (Math.max(im.w, im.h) <= 256) { cw = 1; ch = 1; } // родное разрешение — 1:1
  else { cw = detectPeriod(edgeEnergy(im, 0)); ch = detectPeriod(edgeEnergy(im, 1));
    // поиск периода имеет смысл только для апскейлов пиксель-арта; если сетка вышла
    // слишком грубой — это обычное фото, целимся в ~64 клетки по большой стороне
    if (Math.max(im.w / cw, im.h / ch) < 32) { cw = ch = Math.max(im.w, im.h) / 64; } }
  // клетка < 1 px = апскейл; конвертер никогда не увеличивает разрешение
  cw = Math.max(1, cw); ch = Math.max(1, ch);
  const nx = Math.max(1, Math.round(im.w / cw)), ny = Math.max(1, Math.round(im.h / ch));
  const full: SampleCell[][] = [];
  for (let j = 0; j < ny; j++) { const row: SampleCell[] = [];
    for (let i = 0; i < nx; i++) row.push(cellColor(im, i * im.w / nx, j * im.h / ny,
      (i + 1) * im.w / nx, (j + 1) * im.h / ny));
    full.push(row); }
  const isBg = floodBackground(full, nx, ny, bgTol);
  const grid: SampleCell[][] = [], samples: number[][] = [];
  for (let j = 0; j < ny; j++) { const row: SampleCell[] = [];
    for (let i = 0; i < nx; i++) { const cellValue = full[j]?.[i] ?? null;
      if (isBg[j]?.[i] || !cellValue) row.push(null);
      else { row.push(cellValue); samples.push(cellValue); } }
    grid.push(row); }
  return { grid, samples, nx, ny };
}
