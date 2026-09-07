// Сведение набора цветов к палитре (median-cut) и подбор ближайшего. Чисто.
import type { Color, ColorEntry, ReadColor } from "./quantize-metrics.ts";
import { bnd, ch, chromaD2, cubeKey } from "./quantize-metrics.ts";

const MERGE_TOL = 14;  // итоговые цвета ближе этого сливаются
const DROP_COST = 2;   // порог цены ошибки: дешевле — цвет поглощается соседом

// Выборка палитры из сэмплов и RGBA живёт в отдельном модуле ради размера,
// но остаётся частью одного публичного контракта квантизации.
export { dedupePal, exactPaletteFromRgba, paletteFromGrid, samplesFromRgba,
  sourcePaletteFromSamples } from "./palette-samples.ts";

// выкинуть цвета, чьё исчезновение почти не видно: мало пикселей и есть близкая
// замена. Съедает хвост анти-алиасных переходов, не трогая редкие уникальные тона.
function dropRare(cols: Color[], all: readonly ReadColor[]): Color[] {
  const usage = new Map(cols.map((c) => [c.join(","), 0]));
  for (const s of all) {
    const k = nearest(s, cols).join(",");
    usage.set(k, (usage.get(k) ?? 0) + 1);
  }
  for (;;) {
    let bi = -1, bc = Infinity, bn = -1;
    for (let i = 0; i < cols.length; i++) {
      let nd = Infinity, nj = -1;
      for (let j = 0; j < cols.length; j++) if (j !== i) {
        const d = chromaD2(cols[i] as Color, cols[j] as Color);
        if (d < nd) { nd = d; nj = j; }
      }
      const cost = (usage.get((cols[i] as Color).join(",")) ?? 0) * nd;
      if (cost < bc) { bc = cost; bi = i; bn = nj; }
    }
    if (bi < 0 || bn < 0 || bc >= all.length * DROP_COST) return cols;
    const keepKey = (cols[bn] as Color).join(","), dropKey = (cols[bi] as Color).join(",");
    usage.set(keepKey, (usage.get(keepKey) ?? 0) + (usage.get(dropKey) ?? 0));
    cols.splice(bi, 1);
  }
}

export function medianCut(cols: readonly ReadColor[], n: number): Color[] {
  // Один представитель на куб RGB-пространства: сотни почти одинаковых оттенков
  // схлопываются, редкие уникальные — в своих кубах, остаются.
  const umap = new Map<string, Color>();
  for (const c of cols) {
    const k = cubeKey(c);
    if (!umap.has(k)) umap.set(k, [ch(c, 0), ch(c, 1), ch(c, 2)]);
  }
  const bx: Color[][] = [[...umap.values()]];
  while (bx.length < n) {
    let bi = -1, bv = -1;
    bx.forEach((b, i) => { if (b.length < 2) return;
      const [mn, mx] = bnd(b);
      const v = ch(mx, 0) - ch(mn, 0) + (ch(mx, 1) - ch(mn, 1)) + (ch(mx, 2) - ch(mn, 2));
      if (v > bv) { bv = v; bi = i; } });
    if (bi < 0) break;
    const b = bx[bi] as Color[], [mn, mx] = bnd(b); let axis = 0;
    if (ch(mx, 1) - ch(mn, 1) > ch(mx, axis) - ch(mn, axis)) axis = 1;
    if (ch(mx, 2) - ch(mn, 2) > ch(mx, axis) - ch(mn, axis)) axis = 2;
    b.sort((p, q) => ch(p, axis) - ch(q, axis));
    const mid = b.length >> 1;
    bx.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const avg: ColorEntry[] = bx.map((b) => {
    const s: Color = [0, 0, 0];
    for (const c of b) for (let k = 0; k < 3; k++) s[k] = (s[k] as number) + ch(c, k);
    return { c: s.map((v) => Math.round(v / b.length)), n: b.length };
  });
  // слить почти одинаковые средние (взвешенно): палитра может выйти меньше n
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < avg.length; i++) for (let j = i + 1; j < avg.length; j++) {
      const a = avg[i] as ColorEntry, b = avg[j] as ColorEntry;
      const d = Math.max(Math.abs(ch(a.c, 0) - ch(b.c, 0)),
        Math.abs(ch(a.c, 1) - ch(b.c, 1)), Math.abs(ch(a.c, 2) - ch(b.c, 2)));
      if (d < MERGE_TOL) {
        const w = a.n + b.n;
        avg[i] = { c: a.c.map((v, k) => Math.round((v * a.n + ch(b.c, k) * b.n) / w)), n: w };
        avg.splice(j, 1); merged = true; break outer;
      }
    }
  }
  return dropRare(avg.map((e) => e.c), cols);
}

export const nearest = (c: ReadColor, pal: readonly ReadColor[]): ReadColor => {
  let best = pal[0] ?? [0, 0, 0], bd = Infinity;
  for (const p of pal) {
    const d = (ch(c, 0) - ch(p, 0)) ** 2 + (ch(c, 1) - ch(p, 1)) ** 2 +
      (ch(c, 2) - ch(p, 2)) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
};
