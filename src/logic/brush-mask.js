// Чистая логика кисти-штампа: превращает карту покрытия кончика (0..255) в
// бинарную пиксельную маску заданного размера и синтезирует круглый кончик.
// Без DOM и state — только данные.

// cov = { w, h, data:Uint8Array(0..255) }; size — большая сторона маски в клетках.
// Кадрируем по содержимому, ресемплим с сохранением пропорций, нормируем по
// максимуму и режем порогом. Возвращает { w, h, data:Uint8Array(0/1) } или null.
export function coverageToMask(cov, size, opts = {}) {
  const { threshold = 0.5, floor = 8, invert = false } = opts;
  const { w, h, data } = cov, n = Math.max(1, size | 0);
  const val = invert ? (i) => 255 - data[i] : (i) => data[i];
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (val(y * w + x) > floor) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null; // пусто
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, scale = n / Math.max(bw, bh);
  const tw = Math.max(1, Math.round(bw * scale)), th = Math.max(1, Math.round(bh * scale));
  // идём по клеткам маски и усредняем покрытие исходной области (работает на
  // увеличение и на уменьшение: при апскейле клетки делят один исходный пиксель).
  const avg = new Float64Array(tw * th); let max = 0;
  for (let ty = 0; ty < th; ty++) {
    const sy0 = y0 + (ty * bh / th | 0), sy1 = y0 + Math.max((ty + 1) * bh / th | 0, (ty * bh / th | 0) + 1);
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = x0 + (tx * bw / tw | 0), sx1 = x0 + Math.max((tx + 1) * bw / tw | 0, (tx * bw / tw | 0) + 1);
      let s = 0, c = 0;
      for (let sy = sy0; sy < sy1 && sy <= y1; sy++) for (let sx = sx0; sx < sx1 && sx <= x1; sx++) { s += val(sy * w + sx); c++; }
      const a = c ? s / c : 0; avg[ty * tw + tx] = a; if (a > max) max = a; } }
  if (max <= 0) return null;
  const out = new Uint8Array(tw * th);
  for (let i = 0; i < out.length; i++) out[i] = avg[i] / max >= threshold ? 1 : 0;
  return { w: tw, h: th, data: out };
}

// Бинаризует мелкий grain в дизер-тайл (тайлится в координатах холста). Без
// кадрирования и нормировки — паттерн целиком. null, если тайл вырожден
// (всё вкл/выкл — дизеринга нет). cov = { w, h, data:Uint8Array(0..255) }.
// наименьший период повтора бинарной сетки по оси (горизонталь/вертикаль), ≤ maxP
function period(bin, w, h, maxP, horiz) {
  const lines = Math.min(horiz ? h : w, 8), span = horiz ? w : h;
  for (let p = 1; p <= maxP && p < span; p++) { let ok = true;
    for (let l = 0; l < lines && ok; l++) {
      const fix = (l * (horiz ? h : w) / lines) | 0;
      for (let k = 0; k + p < span; k++) {
        const a = horiz ? bin[fix * w + k] : bin[k * w + fix], b = horiz ? bin[fix * w + k + p] : bin[(k + p) * w + fix];
        if (a !== b) { ok = false; break; } } }
    if (ok) return p; }
  return 0;
}

// grain (покрытие 0..255) → бинарный дизер-тайл. Декод даёт натив; находим
// фундаментальный период (шахматка 1024² → 2×2), иначе max-pool до maxPeriod.
// null — вырожденный grain (дизеринга нет).
export function coverageToTile(cov, threshold = 0.5, maxPeriod = 64) {
  const { w, h, data } = cov, cut = threshold * 255;
  const bin = new Uint8Array(w * h); let on = 0;
  for (let i = 0; i < bin.length; i++) { const v = data[i] >= cut ? 1 : 0; bin[i] = v; on += v; }
  if (on === 0 || on === bin.length) return null;
  const px = period(bin, w, h, maxPeriod, true), py = period(bin, w, h, maxPeriod, false);
  if (px && py) { const out = new Uint8Array(px * py);
    for (let y = 0; y < py; y++) for (let x = 0; x < px; x++) out[y * px + x] = bin[y * w + x];
    return { w: px, h: py, data: out }; }
  if (Math.max(w, h) <= maxPeriod) return { w, h, data: bin };
  const scale = maxPeriod / Math.max(w, h), tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale)), out = new Uint8Array(tw * th);
  for (let y = 0; y < h; y++) { const ty = Math.min(th - 1, (y * th / h) | 0);
    for (let x = 0; x < w; x++) if (bin[y * w + x]) out[ty * tw + Math.min(tw - 1, (x * tw / w) | 0)] = 1; }
  let on2 = 0; for (const v of out) on2 += v; return on2 === 0 || on2 === out.length ? null : { w: tw, h: th, data: out };
}

// Круглый кончик size×size (дефолт для Procreate-кистей без Shape.png).
export function maskRound(size) {
  const n = Math.max(1, size | 0), out = new Uint8Array(n * n), r = n / 2, c = (n - 1) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = x - c, dy = y - c; out[y * n + x] = dx * dx + dy * dy <= r * r ? 1 : 0; }
  return { w: n, h: n, data: out };
}
