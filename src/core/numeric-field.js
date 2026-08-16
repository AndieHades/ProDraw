// Поведение числовых полей: можно ввести 64, 32+8, +8, *2 или /2.
// Относительные выражения считаются от последнего сохранённого значения поля.
import { clamp, evalNumericField, isNumericLiteral } from '../logic/math.js';

export { isNumericLiteral };

const toFinite = (v) => {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const fmt = (v) => Number.isInteger(v) ? String(v) : String(+Number(v).toFixed(4));

export function setNumericField(el, value) {
  const n = Number(value);
  if (!el || !Number.isFinite(n)) return null;
  const text = fmt(n);
  el.value = text;
  el.dataset.numBase = text;
  return n;
}

export function numericFieldValue(el, fallback = 0) {
  if (!el) return fallback;
  if (isNumericLiteral(el.value)) return toFinite(el.value);
  const base = toFinite(el.dataset.numBase);
  if (base != null) return base;
  return fallback;
}

export function commitNumericField(el, opts = {}) {
  if (!el) return null;
  const optBase = toFinite(opts.base);
  const storedBase = toFinite(el.dataset.numBase);
  const base = optBase ?? storedBase ?? opts.fallback ?? 0;
  let n = evalNumericField(el.value, base, { relativeMinus: !!opts.relativeMinus });
  if (!Number.isFinite(n)) { setNumericField(el, base); return null; }
  if (opts.integer) n = Math.round(n);
  n = clamp(n, opts.min ?? -Infinity, opts.max ?? Infinity);
  return setNumericField(el, n);
}
