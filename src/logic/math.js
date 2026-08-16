// Чистые числовые помощники. Один источник для повсеместного «зажима» значений —
// не переписывай Math.max(a, Math.min(b, v)) локально.
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const clamp255 = (v) => clamp(v, 0, 255);
// зажим с округлением — для целочисленных размеров/шагов
export const clampRound = (v, min, max) => clamp(Math.round(v), min, max);

export const isNumericLiteral = (v) => /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(String(v).trim());

function normalizeNumericExpr(v, base, relativeMinus) {
  let s = String(v).trim().replace(/,/g, '.').replace(/[×x]/g, '*').replace(/÷/g, '/');
  if (/^[+*/]/.test(s) || (relativeMinus && s.startsWith('-'))) s = String(base) + s;
  return s;
}

export function evalNumericField(v, base = 0, opts = {}) {
  const src = normalizeNumericExpr(v, Number.isFinite(base) ? base : 0, !!opts.relativeMinus);
  let i = 0;
  const skip = () => { while (/\s/.test(src[i])) i++; };
  const number = () => {
    skip(); const start = i; let dot = false, digit = false;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '.') { if (dot) break; dot = true; i++; }
      else if (/\d/.test(ch)) { digit = true; i++; }
      else break;
    }
    return digit ? Number(src.slice(start, i)) : NaN;
  };
  const factor = () => {
    skip(); const ch = src[i];
    if (ch === '+' || ch === '-') { i++; const v2 = factor(); return ch === '-' ? -v2 : v2; }
    if (ch === '(') { i++; const v2 = expr(); skip(); if (src[i] !== ')') return NaN; i++; return v2; }
    return number();
  };
  const term = () => {
    let out = factor();
    while (Number.isFinite(out)) {
      skip(); const op = src[i]; if (op !== '*' && op !== '/') break; i++;
      const rhs = factor(); if (!Number.isFinite(rhs) || (op === '/' && rhs === 0)) return NaN;
      out = op === '*' ? out * rhs : out / rhs;
    }
    return out;
  };
  function expr() {
    let out = term();
    while (Number.isFinite(out)) {
      skip(); const op = src[i]; if (op !== '+' && op !== '-') break; i++;
      const rhs = term(); if (!Number.isFinite(rhs)) return NaN;
      out = op === '+' ? out + rhs : out - rhs;
    }
    return out;
  }
  const out = expr(); skip();
  return i === src.length && Number.isFinite(out) ? out : NaN;
}
