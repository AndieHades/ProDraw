// Разбор PSD-эффектов слоя (lfx2 Object Descriptor) → эффекты PixelHeart.
// Best-effort и чистый: при любой неожиданности парс прерывается и эффекты
// просто не импортируются (импорт слоя не падает). Маппинг приблизительный.
import { rgbToHex } from './color.js';
import { clamp } from './math.js';

// читалка дескриптора Photoshop из DataView (мутирует локальный p)
function makeReader(dv, u8, start) {
  let p = start;
  const u32 = () => { const v = dv.getUint32(p); p += 4; return v; };
  const key = () => { const len = u32(), n = len || 4; let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u8[p + i]); p += n; return s; };
  const os = () => { let s = ''; for (let i = 0; i < 4; i++) s += String.fromCharCode(u8[p + i]); p += 4; return s; };
  const ucs = () => { const n = u32(); let s = ''; for (let i = 0; i < n; i++) { const ch = dv.getUint16(p); p += 2; if (ch) s += String.fromCharCode(ch); } return s; };
  function value(t) {
    if (t === 'Objc' || t === 'GlbO') return descriptor();
    if (t === 'VlLs') { const n = u32(), a = []; for (let i = 0; i < n; i++) a.push(value(os())); return a; }
    if (t === 'doub') { const v = dv.getFloat64(p); p += 8; return v; }
    if (t === 'UntF') { os(); const v = dv.getFloat64(p); p += 8; return v; }
    if (t === 'TEXT') return ucs();
    if (t === 'enum') { key(); return key(); }
    if (t === 'long') { const v = dv.getInt32(p); p += 4; return v; }
    if (t === 'bool') { const v = u8[p]; p += 1; return !!v; }
    throw new Error('osType ' + t); // незнакомый тип — прерываемся (поймается выше)
  }
  function descriptor() { ucs(); key(); const n = u32(), o = {}; for (let i = 0; i < n; i++) { const k = key(); o[k] = value(os()); } return o; }
  return descriptor;
}

const SUPPORTED = { DrSh: 'dropShadow', IrSh: 'innerShadow', OrGl: 'glow', FrFX: 'stroke' };
const UNSUPPORTED = { IrGl: 'Inner Glow', ebbl: 'Bevel & Emboss', ChFX: 'Satin', SoFi: 'Color Overlay', GrFl: 'Gradient Overlay', patternFill: 'Pattern Overlay' };

const colHex = (c) => (c ? rgbToHex([Math.round(c['Rd  '] || 0), Math.round(c['Grn '] || 0), Math.round(c['Bl  '] || 0)]) : null);

function mapOne(type, o) {
  if (!o || o.enab === false) return null;
  const params = {}, col = colHex(o['Clr ']); if (col) params.color = col;
  const size = o['Sz  '] != null ? o['Sz  '] : o.blur; if (size != null) params.size = clamp(Math.round(size), 1, 16);
  if (o.Opct != null) params.intensity = clamp(o.Opct / 100, 0.05, 1);
  if (o.Dstn != null) { const a = (o.lagl != null ? o.lagl : 120) * Math.PI / 180;
    params.dx = clamp(Math.round(-o.Dstn * Math.cos(a)), -12, 12); params.dy = clamp(Math.round(o.Dstn * Math.sin(a)), -12, 12); }
  return { type, params };
}

// dv/u8 — буфер PSD, off — начало данных lfx2, len — их длина
export function parsePsdEffects(dv, u8, off) {
  try {
    const d = makeReader(dv, u8, off + 8)(); // пропускаем version + descriptor version
    const effects = [], warnings = [];
    for (const k in d) { if (SUPPORTED[k]) { const e = mapOne(SUPPORTED[k], d[k]); if (e) effects.push(e); }
      else if (UNSUPPORTED[k] && d[k] && d[k].enab !== false) warnings.push(UNSUPPORTED[k]); }
    return { effects, warnings };
  } catch (e) { return { effects: [], warnings: ['PSD effects skipped'] }; }
}
