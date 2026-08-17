// Чистые числовые помощники. Один источник для повсеместного «зажима» значений —
// не переписывай Math.max(a, Math.min(b, v)) локально.
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
export const clamp01 = (value: number): number => clamp(value, 0, 1);
export const clamp255 = (value: number): number => clamp(value, 0, 255);
// зажим с округлением — для целочисленных размеров/шагов
export const clampRound = (value: number, min: number, max: number): number =>
  clamp(Math.round(value), min, max);

export const isNumericLiteral = (value: unknown): boolean =>
  /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(String(value).trim());

function normalizeNumericExpr(
  value: unknown, base: number, relativeMinus: boolean
): string {
  let source = String(value).trim().replace(/,/g, ".")
    .replace(/[×x]/g, "*").replace(/÷/g, "/");
  if (/^[+*/]/.test(source) || (relativeMinus && source.startsWith("-"))) {
    source = String(base) + source;
  }
  return source;
}

export function evalNumericField(
  value: unknown, base = 0, options: { readonly relativeMinus?: boolean } = {}
): number {
  const src = normalizeNumericExpr(value, Number.isFinite(base) ? base : 0,
    options.relativeMinus === true);
  let i = 0;
  const skip = (): void => { while (/\s/.test(src[i] ?? "")) i += 1; };
  const number = (): number => {
    skip(); const start = i; let dot = false, digit = false;
    while (i < src.length) {
      const ch = src[i] ?? "";
      if (ch === '.') { if (dot) break; dot = true; i++; }
      else if (/\d/.test(ch)) { digit = true; i++; }
      else break;
    }
    return digit ? Number(src.slice(start, i)) : NaN;
  };
  const factor = (): number => {
    skip(); const ch = src[i];
    if (ch === '+' || ch === '-') { i++; const v2 = factor(); return ch === '-' ? -v2 : v2; }
    if (ch === '(') { i++; const v2 = expr(); skip(); if (src[i] !== ')') return NaN; i++; return v2; }
    return number();
  };
  const term = (): number => {
    let out = factor();
    while (Number.isFinite(out)) {
      skip(); const op = src[i]; if (op !== '*' && op !== '/') break; i++;
      const rhs = factor(); if (!Number.isFinite(rhs) || (op === '/' && rhs === 0)) return NaN;
      out = op === '*' ? out * rhs : out / rhs;
    }
    return out;
  };
  function expr(): number {
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
