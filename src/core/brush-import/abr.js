// Импорт кисти Photoshop (.abr): достаёт семплированные кончики (bitmap-маски).
// Big-endian. v1/v2 — список кистей; v6/v10 — секции 8BIM 'samp'. Параметрические
// (computed) кисти и дескрипторы динамики пока пропускаем — берём растровый кончик.
// Без эталонного .abr под рукой v6 разобран best-effort.

// PackBits по строкам (как в PSD): comp=1. Возвращает Uint8Array(w*h) или null.
function readBitmap(u, p, w, h, depth, comp) {
  if (depth !== 8 || w <= 0 || h <= 0) return null;
  const out = new Uint8Array(w * h);
  if (!comp) { for (let i = 0; i < w * h; i++) out[i] = u[p + i]; return out; }
  let q = p + h * 2; // таблица длин строк (shorts) — пропускаем, читаем потоком
  for (let y = 0; y < h; y++) { let x = 0;
    while (x < w && q < u.length) { const n = u[q++];
      if (n < 128) { for (let k = 0; k <= n && x < w; k++) out[y * w + x++] = u[q++]; }
      else if (n > 128) { const v = u[q++]; for (let k = 0; k < 257 - n && x < w; k++) out[y * w + x++] = v; } } }
  return out;
}

// яркий фон (углы светлые) → инвертируем, чтобы покрытие = чернила кисти
function toCoverage(out, w, h) {
  const corners = (out[0] + out[w - 1] + out[(h - 1) * w] + out[h * w - 1]) / 4;
  if (corners > 127) for (let i = 0; i < out.length; i++) out[i] = 255 - out[i];
  return { w, h, data: out };
}

export async function importAbr(buf) {
  const u = new Uint8Array(buf), dv = new DataView(buf); let p = 0;
  const r16 = () => { const v = dv.getUint16(p); p += 2; return v; };
  const r32 = () => { const v = dv.getUint32(p); p += 4; return v; };
  const s16 = () => { const v = dv.getInt16(p); p += 2; return v; };
  const s32 = () => { const v = dv.getInt32(p); p += 4; return v; };
  const tag = () => { const s = String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]); p += 4; return s; };
  const tips = [], ver = r16();

  if (ver === 1 || ver === 2) {
    const count = r16();
    for (let i = 0; i < count && p < u.length; i++) {
      const type = r16(), len = r32(), end = p + len;
      if (type === 2) { p += 4; r16(); // misc + spacing
        if (ver === 2) { const nl = r32(); p += nl * 2; } // имя (utf-16)
        p += 1; s16(); s16(); s16(); s16(); // antialias + bounds(short)
        const top = s32(), left = s32(), bottom = s32(), right = s32();
        const depth = r16(), comp = u[p++], w = right - left, h = bottom - top;
        const bm = readBitmap(u, p, w, h, depth, comp); if (bm) tips.push(toCoverage(bm, w, h)); }
      p = end;
    }
  } else if (ver === 6 || ver === 10) {
    r16(); // subversion
    while (p + 12 <= u.length) {
      if (tag() !== '8BIM') break; const key = tag(), len = r32(), secEnd = p + len;
      if (key === 'samp') { while (p < secEnd - 4) {
        const bsize = r32(); let bend = p + bsize; bend = (bend + 3) & ~3;
        const top = s32(), left = s32(), bottom = s32(), right = s32();
        const depth = r16(), comp = u[p++], w = right - left, h = bottom - top;
        if (w > 0 && h > 0 && w < 8192 && h < 8192) { const bm = readBitmap(u, p, w, h, depth, comp); if (bm) tips.push(toCoverage(bm, w, h)); }
        p = bend; } }
      p = secEnd;
    }
  }
  if (!tips.length) throw new Error('abr: no sampled brushes');
  return tips.map((cov, i) => ({ name: 'ABR ' + (i + 1), source: 'abr', shape: 'shape', cov, grain: null, params: {} }));
}
