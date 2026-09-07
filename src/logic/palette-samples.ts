// Выбор палитры из готовых сэмплов и из RGBA-буферов. Отделено от median-cut
// ради размера модуля; общие метрики — в quantize-metrics.
import type { Color, ColorEntry, ReadColor } from "./quantize-metrics.ts";
import { bnd, ch, chromaD2, cubeKey, keyOf } from "./quantize-metrics.ts";

function sourceEntries(cols: readonly ReadColor[]): ColorEntry[] {
  const m = new Map<string, ColorEntry>();
  for (const c of cols) {
    const k = cubeKey(c), e = m.get(k);
    if (e) e.n++; else m.set(k, { c: [ch(c, 0), ch(c, 1), ch(c, 2)], n: 1 });
  }
  return [...m.values()];
}
const bounds = (b: readonly ColorEntry[]): [Color, Color] => bnd(b.map((e) => e.c));

function boxColor(b: readonly ColorEntry[]): Color {
  const avg: Color = [0, 0, 0]; let total = 0;
  for (const e of b) { total += e.n;
    for (let k = 0; k < 3; k++) avg[k] = (avg[k] as number) + ch(e.c, k) * e.n; }
  const center = avg.map((v) => Math.round(v / (total || 1)));
  let best = b[0] as ColorEntry, bd = Infinity;
  for (const e of b) { const d = chromaD2(e.c, center);
    if (d < bd || (d === bd && e.n > best.n)) { bd = d; best = e; } }
  return best.c;
}

export function sourcePaletteFromSamples(cols: readonly ReadColor[], n: number): Color[] {
  const entries = sourceEntries(cols);
  if (entries.length <= n) return entries.map((e) => e.c);
  const bx: ColorEntry[][] = [entries];
  while (bx.length < n) {
    let bi = -1, bv = -1;
    bx.forEach((b, i) => { if (b.length < 2) return;
      const [mn, mx] = bounds(b);
      const v = ch(mx, 0) - ch(mn, 0) + (ch(mx, 1) - ch(mn, 1)) + (ch(mx, 2) - ch(mn, 2));
      if (v > bv) { bv = v; bi = i; } });
    if (bi < 0) break;
    const b = bx[bi] as ColorEntry[], [mn, mx] = bounds(b); let axis = 0;
    if (ch(mx, 1) - ch(mn, 1) > ch(mx, axis) - ch(mn, axis)) axis = 1;
    if (ch(mx, 2) - ch(mn, 2) > ch(mx, axis) - ch(mn, axis)) axis = 2;
    b.sort((p, q) => ch(p.c, axis) - ch(q.c, axis));
    const total = b.reduce((s, e) => s + e.n, 0); let acc = 0, mid = 1;
    for (; mid < b.length - 1; mid++) { acc += (b[mid - 1] as ColorEntry).n;
      if (acc >= total / 2) break; }
    bx.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const seen = new Set<string>(), out: Color[] = [];
  for (const c of bx.map(boxColor)) {
    const k = keyOf(c); if (!seen.has(k)) { seen.add(k); out.push(c); }
  }
  for (const e of entries.sort((a, b) => b.n - a.n)) {
    if (out.length >= n) break;
    const k = keyOf(e.c); if (!seen.has(k)) { seen.add(k); out.push(e.c); }
  }
  return out;
}

export function paletteFromGrid(
  g: readonly (readonly (ReadColor | null | undefined)[])[], cap = 32
): Color[] {
  const m = new Map<string, ColorEntry>();
  for (const row of g) for (const c of row) {
    if (!c) continue;
    const k = keyOf(c); // только RGB: полупрозрачные варианты не плодят дубликаты
    const e = m.get(k);
    if (e) e.n++; else m.set(k, { c: [ch(c, 0), ch(c, 1), ch(c, 2)], n: 1 });
  }
  return [...m.values()].sort((a, b) => b.n - a.n).slice(0, cap).map((e) => e.c);
}

export function exactPaletteFromRgba(data: ArrayLike<number>, limit = Infinity):
  { colors: Color[]; overflow: boolean } {
  const seen = new Set<string>(), colors: Color[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) <= 127) continue;
    const k = data[i] + "," + data[i + 1] + "," + data[i + 2];
    if (seen.has(k)) continue;
    seen.add(k);
    colors.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
    if (colors.length > limit) return { colors, overflow: true };
  }
  return { colors, overflow: false };
}

export function samplesFromRgba(data: ArrayLike<number>): Color[] {
  const samples: Color[] = [];
  for (let i = 0; i < data.length; i += 4) if ((data[i + 3] ?? 0) > 127) {
    samples.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
  }
  return samples;
}

export function dedupePal(arr: readonly (ReadColor | null | undefined)[] |
  null | undefined): Color[] {
  const seen = new Set<string>(), out: Color[] = [];
  for (const c of arr || []) {
    if (!c) continue; const k = keyOf(c);
    if (!seen.has(k)) { seen.add(k); out.push([ch(c, 0), ch(c, 1), ch(c, 2)]); }
  }
  return out.length ? out : [[12, 12, 16]];
}
