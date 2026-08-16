const finite = (v, fallback = 0) => Number.isFinite(+v) ? +v : fallback;

export const textLines = (value) => String(value || '').split(/\r?\n/);
export const displayText = (src = {}) => (src.uppercase ? String(src.value || '').toUpperCase() : String(src.value || ''));
export const displayLines = (src = {}) => textLines(displayText(src));
export const lineAdvance = (src = {}) => Math.max(1, Math.round(finite(src.size, 1) + finite(src.lineSpacing, 0)));

export function lineWidth(src = {}, line = '', measure) {
  const chars = [...String(line || '')], gap = finite(src.letterSpacing, 0);
  if (!chars.length) return measure(' ');
  return chars.reduce((w, ch, i) => w + measure(ch) + (i ? gap : 0), 0);
}

export function maxLineWidth(src = {}, measure) {
  return Math.max(1, ...displayLines(src).map((line) => lineWidth(src, line, measure)));
}
