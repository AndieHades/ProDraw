// Сведение набора цветов к палитре (median-cut) и подбор ближайшего. Чисто.
const CUBE_SHIFT = 4;  // дедупликация входа по кубам 16×16×16: почти одинаковые оттенки — один голос
const MERGE_TOL = 14;  // итоговые цвета ближе этого (по макс. каналу) сливаются — в палитре нет почти-дублей
const DROP_COST = 2;   // порог цены ошибки (usage·d²/пиксель): дешевле — цвет поглощается соседом

// цветностное расстояние²: разница тона (R−G, G−B) дороже разницы яркости —
// анти-алиасные переходы того же тона близко, уникальный тон (зелёные глаза) далеко
const chromaD2 = (a, b) => { const rg = (a[0] - a[1]) - (b[0] - b[1]), gb = (a[1] - a[2]) - (b[1] - b[2]),
  l = (a[0] + a[1] + a[2] - b[0] - b[1] - b[2]) / 3; return 4 * (rg * rg + gb * gb) + l * l; };
const keyOf = (c) => c[0] + ',' + c[1] + ',' + c[2];

// выкинуть цвета, чьё исчезновение почти не видно: мало пикселей и есть близкая
// замена. Съедает хвост анти-алиасных переходов, не трогая редкие уникальные тона.
function dropRare(cols, all) {
  const usage = new Map(cols.map((c) => [c.join(','), 0]));
  for (const s of all) { const k = nearest(s, cols).join(','); usage.set(k, usage.get(k) + 1); }
  for (;;) { let bi = -1, bc = Infinity, bn = -1;
    for (let i = 0; i < cols.length; i++) { let nd = Infinity, nj = -1;
      for (let j = 0; j < cols.length; j++) if (j !== i) { const d = chromaD2(cols[i], cols[j]); if (d < nd) { nd = d; nj = j; } }
      const cost = usage.get(cols[i].join(',')) * nd; if (cost < bc) { bc = cost; bi = i; bn = nj; } }
    if (bi < 0 || bc >= all.length * DROP_COST) return cols;
    usage.set(cols[bn].join(','), usage.get(cols[bn].join(',')) + usage.get(cols[bi].join(',')));
    cols.splice(bi, 1); }
}

export function medianCut(cols, n) {
  // Один представитель на куб RGB-пространства: сотни почти одинаковых оттенков
  // (кожа, волосы) схлопываются, редкие уникальные (зелёные глаза) — в своих кубах, остаются.
  const umap = new Map();
  for (const c of cols) { const k = (c[0] >> CUBE_SHIFT) + ',' + (c[1] >> CUBE_SHIFT) + ',' + (c[2] >> CUBE_SHIFT); if (!umap.has(k)) umap.set(k, [c[0], c[1], c[2]]); }
  let bx = [[...umap.values()]];
  const bnd = (b) => { const mn = [255, 255, 255], mx = [0, 0, 0]; for (const c of b) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], c[k]); mx[k] = Math.max(mx[k], c[k]); } return [mn, mx]; };
  while (bx.length < n) { let bi = -1, bv = -1; bx.forEach((b, i) => { if (b.length < 2) return; const [mn, mx] = bnd(b), v = (mx[0] - mn[0]) + (mx[1] - mn[1]) + (mx[2] - mn[2]); if (v > bv) { bv = v; bi = i; } }); if (bi < 0) break;
    const b = bx[bi], [mn, mx] = bnd(b); let ch = 0; if (mx[1] - mn[1] > mx[ch] - mn[ch]) ch = 1; if (mx[2] - mn[2] > mx[ch] - mn[ch]) ch = 2; b.sort((p, q) => p[ch] - q[ch]); const mid = b.length >> 1; bx.splice(bi, 1, b.slice(0, mid), b.slice(mid)); }
  const avg = bx.map((b) => { const s = [0, 0, 0]; for (const c of b) for (let k = 0; k < 3; k++) s[k] += c[k]; return { c: s.map((v) => Math.round(v / b.length)), w: b.length }; });
  // слить почти одинаковые средние (взвешенно): палитра может выйти меньше n — это ок
  for (let merged = true; merged;) { merged = false;
    outer: for (let i = 0; i < avg.length; i++) for (let j = i + 1; j < avg.length; j++) {
      const a = avg[i], b = avg[j], d = Math.max(Math.abs(a.c[0] - b.c[0]), Math.abs(a.c[1] - b.c[1]), Math.abs(a.c[2] - b.c[2]));
      if (d < MERGE_TOL) { const w = a.w + b.w; avg[i] = { c: a.c.map((v, k) => Math.round((v * a.w + b.c[k] * b.w) / w)), w };
        avg.splice(j, 1); merged = true; break outer; } } }
  return dropRare(avg.map((e) => e.c), cols);
}

export const nearest = (c, pal) => { let best = pal[0], bd = Infinity; for (const p of pal) { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; best = p; } } return best; };

function sourceEntries(cols) { const m = new Map();
  for (const c of cols) { const k = (c[0] >> CUBE_SHIFT) + ',' + (c[1] >> CUBE_SHIFT) + ',' + (c[2] >> CUBE_SHIFT);
    const e = m.get(k); if (e) e.n++; else m.set(k, { c: [c[0], c[1], c[2]], n: 1 }); }
  return [...m.values()];
}
const bounds = (b) => { const mn = [255, 255, 255], mx = [0, 0, 0];
  for (const e of b) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], e.c[k]); mx[k] = Math.max(mx[k], e.c[k]); }
  return [mn, mx];
};
function boxColor(b) { const avg = [0, 0, 0]; let total = 0;
  for (const e of b) { total += e.n; for (let k = 0; k < 3; k++) avg[k] += e.c[k] * e.n; }
  const center = avg.map((v) => Math.round(v / total)); let best = b[0], bd = Infinity;
  for (const e of b) { const d = chromaD2(e.c, center); if (d < bd || (d === bd && e.n > best.n)) { bd = d; best = e; } }
  return best.c;
}
export function sourcePaletteFromSamples(cols, n) {
  const entries = sourceEntries(cols); if (entries.length <= n) return entries.map((e) => e.c);
  let bx = [entries];
  while (bx.length < n) { let bi = -1, bv = -1;
    bx.forEach((b, i) => { if (b.length < 2) return; const [mn, mx] = bounds(b), v = (mx[0] - mn[0]) + (mx[1] - mn[1]) + (mx[2] - mn[2]); if (v > bv) { bv = v; bi = i; } });
    if (bi < 0) break; const b = bx[bi], [mn, mx] = bounds(b); let ch = 0;
    if (mx[1] - mn[1] > mx[ch] - mn[ch]) ch = 1; if (mx[2] - mn[2] > mx[ch] - mn[ch]) ch = 2;
    b.sort((p, q) => p.c[ch] - q.c[ch]); const total = b.reduce((s, e) => s + e.n, 0); let acc = 0, mid = 1;
    for (; mid < b.length - 1; mid++) { acc += b[mid - 1].n; if (acc >= total / 2) break; }
    bx.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const seen = new Set(), out = [];
  for (const c of bx.map(boxColor)) { const k = keyOf(c); if (!seen.has(k)) { seen.add(k); out.push(c); } }
  for (const e of entries.sort((a, b) => b.n - a.n)) { if (out.length >= n) break; const k = keyOf(e.c); if (!seen.has(k)) { seen.add(k); out.push(e.c); } }
  return out;
}

export function paletteFromGrid(g, cap = 32) { const m = new Map();
  for (const row of g) for (const c of row) { if (!c) continue;
    const k = c[0] + ',' + c[1] + ',' + c[2]; // только RGB: полупрозрачные варианты того же цвета не плодят дубликаты
    const e = m.get(k); if (e) e.n++; else m.set(k, { c: [c[0], c[1], c[2]], n: 1 }); }
  return [...m.values()].sort((a, b) => b.n - a.n).slice(0, cap).map((e) => e.c); }

export function exactPaletteFromRgba(data, limit = Infinity) {
  const seen = new Set(), colors = [];
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] <= 127) continue;
    const k = data[i] + ',' + data[i + 1] + ',' + data[i + 2]; if (seen.has(k)) continue;
    seen.add(k); colors.push([data[i], data[i + 1], data[i + 2]]);
    if (colors.length > limit) return { colors, overflow: true }; }
  return { colors, overflow: false };
}

export function samplesFromRgba(data) { const samples = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) samples.push([data[i], data[i + 1], data[i + 2]]);
  return samples;
}

export function dedupePal(arr) { const seen = new Set(), out = [];
  for (const c of arr || []) { if (!c) continue; const k = c[0] + ',' + c[1] + ',' + c[2];
    if (!seen.has(k)) { seen.add(k); out.push([c[0], c[1], c[2]]); } }
  return out.length ? out : [[12, 12, 16]]; }
