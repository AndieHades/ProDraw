// Разбор PSD-эффектов слоя (lfx2 Object Descriptor) → эффекты PixelHeart.
// Best-effort и чистый: при любой неожиданности парс прерывается и эффекты
// просто не импортируются (импорт слоя не падает). Маппинг приблизительный.
import { rgbToHex } from './color.js';
import { clamp } from './math.ts';

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

const colHex = (c) => (c ? rgbToHex([Math.round(c.r ?? c['Rd  '] ?? 0),
  Math.round(c.g ?? c['Grn '] ?? 0), Math.round(c.b ?? c['Bl  '] ?? 0)]) : null);

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

const unit = (entry, fallback = 0) => typeof entry === 'number' ? entry
  : typeof entry?.value === 'number' ? entry.value : fallback;
const runtimeColor = (entry, fallback = '#000000') => colHex(entry) || fallback;
function runtimeOffset(properties) {
  const angle = unit(properties.angle, 120) * Math.PI / 180;
  const distance = clamp(Math.round(unit(properties.distance)), -128, 128);
  return { dx: Math.round(-distance * Math.cos(angle)),
    dy: Math.round(distance * Math.sin(angle)) };
}
const runtime = (type, source, params) => ({ type, visible: source.enabled,
  opacity: source.opacity, params: { ...params, psdKind: source.kind,
    blendMode: source.properties.blendMode || 'normal' } });
function runtimeShadow(source, type = 'dropShadow') {
  const p = source.properties;
  return runtime(type, source, { size: clamp(Math.round(unit(p.size, 1)), 1, 64),
    intensity: 1, color: runtimeColor(p.color), ...runtimeOffset(p) });
}
function runtimeBevel(source, warnings) {
  warnings.add('effect.bevel.approximate');
  const p = source.properties, size = clamp(Math.round(unit(p.size, 2)), 1, 64);
  const distance = Math.max(1, Math.round(size / 2)), angle = unit(p.angle, 120);
  const direction = p.direction === 'down' ? -1 : 1;
  const at = (kind, tint, opacity, degrees) => runtime('innerShadow',
    { ...source, kind, opacity: clamp(unit(opacity, source.opacity), 0, 1) },
    { size, intensity: 1, color: runtimeColor(tint),
      ...runtimeOffset({ angle: degrees, distance: distance * direction }) });
  return [at('bevelHighlight', p.highlightColor, p.highlightOpacity, angle + 180),
    at('bevelShadow', p.shadowColor, p.shadowOpacity, angle)];
}
function runtimeOne(source, warnings) {
  const p = source.properties;
  if (source.kind === 'dropShadow') return [runtimeShadow(source)];
  if (source.kind === 'innerShadow') return [runtimeShadow(source, 'innerShadow')];
  if (source.kind === 'outerGlow') return [runtime('glow', source,
    { size: clamp(Math.round(unit(p.size, 6)), 1, 64), intensity: 1,
      color: runtimeColor(p.color, '#ffffff') })];
  if (source.kind === 'innerGlow') { warnings.add('effect.innerGlow.approximate');
    return [runtime('innerShadow', source, { size: clamp(Math.round(unit(p.size, 6)),
      1, 64), intensity: 1, color: runtimeColor(p.color, '#ffffff'), dx: 0, dy: 0 })]; }
  if (source.kind === 'stroke') {
    if (p.fillType && p.fillType !== 'color') warnings.add(`effect.stroke.${p.fillType}`);
    if (p.position && p.position !== 'outside') warnings.add(`effect.stroke.${p.position}`);
    return [runtime('stroke', source, { size: clamp(Math.round(unit(p.size, 1)), 1, 64),
      color: runtimeColor(p.color) })];
  }
  if (source.kind === 'solidFill') return [runtime('colorOverlay', source,
    { color: runtimeColor(p.color), blendMode: p.blendMode || 'normal' })];
  if (source.kind === 'gradientOverlay') {
    if (p.gradient?.type === 'noise') warnings.add('effect.gradient.noise.approximate');
    return [runtime('gradientOverlay', source, structuredClone(p))];
  }
  if (source.kind === 'bevel') return runtimeBevel(source, warnings);
  if (source.kind === 'satin') { warnings.add('effect.satin.approximate');
    return [runtimeShadow(source, 'innerShadow')]; }
  warnings.add('effect.patternOverlay.resource'); return [];
}
export function runtimePsdEffectSpecs(sources = [], warnings = new Set()) {
  return sources.flatMap((source) => source.enabled ? runtimeOne(source, warnings) : []);
}
