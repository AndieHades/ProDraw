import type { AlphaPlane } from "./alphaPlane.ts";

// Связные пятна альфа-плана (8 соседей). Union-find идёт по отрезкам строк, а
// не по пикселям: сплошной рисунок — один отрезок на строку, поэтому память
// растёт с числом отрезков, а не с площадью.
export interface AlphaComponent {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  pixels: number;
  peak: number;
}

interface Runs {
  readonly y: number[];
  readonly x0: number[];
  readonly x1: number[];
  readonly peak: number[];
  readonly rowStart: number[];
}

function collectRuns(plane: AlphaPlane, maxRuns: number): Runs | null {
  const runs: Runs = { y: [], x0: [], x1: [], peak: [], rowStart: [] };
  const { alpha, width, height } = plane;
  for (let y = 0; y < height; y++) {
    runs.rowStart.push(runs.x0.length);
    const base = y * width;
    for (let x = 0; x < width; x++) {
      if (!alpha[base + x]) continue;
      let peak = 0, end = x;
      while (end < width && alpha[base + end]) {
        peak = Math.max(peak, alpha[base + end] ?? 0); end++;
      }
      if (runs.x0.length >= maxRuns) return null;
      runs.y.push(y); runs.x0.push(x); runs.x1.push(end - 1); runs.peak.push(peak);
      x = end;
    }
  }
  runs.rowStart.push(runs.x0.length);
  return runs;
}

function find(parent: Int32Array, index: number): number {
  let root = index;
  while (parent[root] !== root) root = parent[root] ?? root;
  while (parent[index] !== root) { const next = parent[index] ?? root;
    parent[index] = root; index = next; }
  return root;
}

function union(parent: Int32Array, left: number, right: number): void {
  const a = find(parent, left), b = find(parent, right);
  if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
}

// Отрезки соседних строк касаются, если пересекаются с запасом в 1 пиксель
// (диагональ). Оба списка отсортированы по x, поэтому хватает двух указателей.
function linkRows(runs: Runs, parent: Int32Array, row: number): void {
  const prevEnd = runs.rowStart[row] ?? 0, end = runs.rowStart[row + 1] ?? 0;
  let previous = runs.rowStart[row - 1] ?? 0;
  for (let current = prevEnd; current < end; current++) {
    const x0 = (runs.x0[current] ?? 0) - 1, x1 = (runs.x1[current] ?? 0) + 1;
    while (previous < prevEnd && (runs.x1[previous] ?? 0) < x0) previous++;
    for (let other = previous; other < prevEnd && (runs.x0[other] ?? 0) <= x1; other++)
      union(parent, current, other);
  }
}

// null — план слишком шумный для разбора (см. maxRuns).
export function alphaComponents(plane: AlphaPlane,
  maxRuns: number): AlphaComponent[] | null {
  const runs = collectRuns(plane, maxRuns); if (!runs) return null;
  const count = runs.x0.length, parent = new Int32Array(count);
  for (let index = 0; index < count; index++) parent[index] = index;
  for (let row = 1; row < plane.height; row++) linkRows(runs, parent, row);
  const components = new Map<number, AlphaComponent>();
  for (let index = 0; index < count; index++) {
    const root = find(parent, index), y = (runs.y[index] ?? 0) + plane.miny;
    const minx = (runs.x0[index] ?? 0) + plane.minx;
    const maxx = (runs.x1[index] ?? 0) + plane.minx, peak = runs.peak[index] ?? 0;
    const known = components.get(root);
    if (!known) { components.set(root, { minx, miny: y, maxx, maxy: y,
      pixels: maxx - minx + 1, peak }); continue; }
    known.minx = Math.min(known.minx, minx); known.maxx = Math.max(known.maxx, maxx);
    known.miny = Math.min(known.miny, y); known.maxy = Math.max(known.maxy, y);
    known.pixels += maxx - minx + 1; known.peak = Math.max(known.peak, peak);
  }
  return [...components.values()];
}
