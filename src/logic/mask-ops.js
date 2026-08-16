// Чистые булевы операции над масками выделения (множества ключей "x,y").
// Независимы от способа построения контура — общая основа для всех
// инструментов выделения (лассо, прямоугольник, волшебная палочка…).
export const SEL_OPS = ['replace', 'add', 'subtract', 'intersect'];

// base — текущая маска (Set) или null; addition — новая область (Set).
// Возвращает новый Set, не мутируя аргументы.
export function combineMask(base, addition, op) {
  if (op === 'replace' || !base) return new Set(addition);
  if (op === 'add') { const out = new Set(base); for (const k of addition) out.add(k); return out; }
  if (op === 'subtract') { const out = new Set(base); for (const k of addition) out.delete(k); return out; }
  if (op === 'intersect') { const out = new Set(); for (const k of addition) if (base.has(k)) out.add(k); return out; }
  return new Set(addition);
}
