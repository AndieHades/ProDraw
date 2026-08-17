// Поведение числовых полей: можно ввести 64, 32+8, +8, *2 или /2.
// Относительные выражения считаются от последнего сохранённого значения поля.
import { clamp, evalNumericField, isNumericLiteral } from "../logic/math.ts";

export { isNumericLiteral };

export interface NumericFieldOptions {
  readonly base?: number;
  readonly fallback?: number;
  readonly integer?: boolean;
  readonly max?: number;
  readonly min?: number;
  readonly relativeMinus?: boolean;
}

const toFinite = (value: unknown): number | null => {
  const s = String(value ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const format = (value: number): string => Number.isInteger(value)
  ? String(value) : String(+value.toFixed(4));

export function setNumericField(
  element: HTMLInputElement | null, value: unknown
): number | null {
  const n = Number(value);
  if (!element || !Number.isFinite(n)) return null;
  const text = format(n);
  element.value = text;
  element.dataset.numBase = text;
  return n;
}

export function numericFieldValue(
  element: HTMLInputElement | null, fallback = 0
): number {
  if (!element) return fallback;
  if (isNumericLiteral(element.value)) return toFinite(element.value) ?? fallback;
  const base = toFinite(element.dataset.numBase);
  if (base != null) return base;
  return fallback;
}

export function commitNumericField(
  element: HTMLInputElement | null, options: NumericFieldOptions = {}
): number | null {
  if (!element) return null;
  const optBase = toFinite(options.base);
  const storedBase = toFinite(element.dataset.numBase);
  const base = optBase ?? storedBase ?? options.fallback ?? 0;
  let n = evalNumericField(element.value, base,
    { relativeMinus: options.relativeMinus === true });
  if (!Number.isFinite(n)) {
    setNumericField(element, base);
    return null;
  }
  if (options.integer) n = Math.round(n);
  n = clamp(n, options.min ?? -Infinity, options.max ?? Infinity);
  return setNumericField(element, n);
}
