// Чтение PSD (8-бит RGB/RGBA, raw и RLE/PackBits) → { W, H, layers:[…] }.
// На слой: { name, grid, visible, section (1/2 заголовок группы, 3 разделитель),
// effects, warnings }. Достаточно для экспортов и импорта; zip-сжатие не читаем.
import { parsePsdEffects } from './psd-effects.js';

export function readPsd(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf); let p = 0;
  const u16 = () => { const v = dv.getUint16(p); p += 2; return v; };
  const i16 = () => { const v = dv.getInt16(p); p += 2; return v; };
  const u32 = () => { const v = dv.getUint32(p); p += 4; return v; };
  const sig = () => { const s = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]); p += 4; return s; };
  if (sig() !== '8BPS') return null;
  u16(); p += 6; u16(); const H = u32(), W = u32(), depth = u16(); u16();
  if (depth !== 8) return null;
  p += u32(); p += u32(); // color mode + resources
  u32(); // layer+mask info length
  u32(); // layer info length
  let count = Math.abs(i16());
  const recs = [];
  for (let i = 0; i < count; i++) {
    const top = dv.getInt32(p); p += 4; const left = dv.getInt32(p); p += 4; const bottom = dv.getInt32(p); p += 4; const right = dv.getInt32(p); p += 4;
    const nch = u16(), chans = [];
    for (let c = 0; c < nch; c++) { const cid = i16(); const clen = u32(); chans.push({ cid, clen }); }
    sig(); sig(); // blend sig + key
    const flags = u8[p + 2]; p += 4; // opacity + clip + flags + filler
    const visible = !(flags & 2); // бит 2 = скрытый слой
    const extraEnd = p + u32();
    p += u32(); // layer mask
    p += u32(); // blending ranges
    const nlen = u8[p]; p += 1; let name = ''; for (let k = 0; k < nlen; k++) name += String.fromCharCode(u8[p + k]); p += nlen;
    const pad = (nlen + 1) % 4; if (pad) p += 4 - pad;
    let section = 0, effects = null, warnings = null;
    while (p < extraEnd - 12) { if (String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]) !== '8BIM') break;
      const key = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]); const len = dv.getUint32(p + 8);
      if (key === 'luni') { const n = dv.getUint32(p + 12); let un = ''; for (let k = 0; k < n; k++) un += String.fromCharCode(dv.getUint16(p + 16 + k * 2)); if (un) name = un; }
      else if (key === 'lsct' && len >= 4) section = dv.getUint32(p + 12); // 1 откр.группа, 2 закр., 3 разделитель
      else if (key === 'lfx2') { const r = parsePsdEffects(dv, u8, p + 12); effects = r.effects; warnings = r.warnings; }
      p += 12 + len + (len % 2); }
    p = extraEnd;
    recs.push({ top, left, bottom, right, chans, name, visible, section, effects, warnings });
  }
  for (const r of recs) { const lw = r.right - r.left, lh = r.bottom - r.top;
    r.grid = Array.from({ length: H }, () => new Array(W).fill(null)); if (lw <= 0 || lh <= 0) { for (const ch of r.chans) p += ch.clen; continue; }
    const planes = {};
    for (const ch of r.chans) { const comp = u16(); const plane = new Uint8Array(lw * lh);
      if (comp === 0) { plane.set(u8.subarray(p, p + lw * lh)); p += lw * lh; }
      else if (comp === 1) { const counts = []; for (let y = 0; y < lh; y++) counts.push(u16());
        let o = 0; for (let y = 0; y < lh; y++) { const end = p + counts[y]; while (p < end) { const n = dv.getInt8(p); p++;
          if (n >= 0) { for (let k = 0; k <= n; k++) plane[o++] = u8[p++]; } else if (n !== -128) { const v = u8[p++]; for (let k = 0; k < 1 - n; k++) plane[o++] = v; } } } }
      else { return null; }
      planes[ch.cid] = plane; }
    const R = planes[0], G = planes[1], B = planes[2], A = planes[-1];
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const gx = r.left + x, gy = r.top + y; if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
      const o = y * lw + x, a = A ? A[o] : 255; if (A && a < 8) continue; r.grid[gy][gx] = [R ? R[o] : 0, G ? G[o] : 0, B ? B[o] : 0, a]; }
  }
  return { W, H, layers: recs.map((r) => ({ name: r.name, grid: r.grid, visible: r.visible, section: r.section, effects: r.effects, warnings: r.warnings })) };
}
