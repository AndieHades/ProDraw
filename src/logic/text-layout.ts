type TextLayoutSource = Partial<Record<"value" | "uppercase" | "size" |
  "lineSpacing" | "letterSpacing", unknown>>;
type MeasureText = (character: string) => number;
const object = (value: unknown): TextLayoutSource =>
  value && typeof value === "object" ? value as TextLayoutSource : {};
const finite = (value: unknown, fallback = 0): number =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export const textLines = (value: unknown): string[] => String(value || "").split(/\r?\n/);
export const displayText = (value: unknown = {}): string => {
  const source = object(value), text = String(source.value || "");
  return source.uppercase ? text.toUpperCase() : text;
};
export const displayLines = (source: unknown = {}): string[] =>
  textLines(displayText(source));
export const lineAdvance = (value: unknown = {}): number => {
  const source = object(value);
  return Math.max(1, Math.round(finite(source.size, 1) + finite(source.lineSpacing)));
};
export function lineWidth(value: unknown = {}, line = "", measure: MeasureText): number {
  const source = object(value), characters = [...String(line || "")];
  const gap = finite(source.letterSpacing);
  if (!characters.length) return measure(" ");
  return characters.reduce((width, character, index) =>
    width + measure(character) + (index ? gap : 0), 0);
}
export function maxLineWidth(source: unknown = {}, measure: MeasureText): number {
  return Math.max(1, ...displayLines(source).map((line) => lineWidth(source, line, measure)));
}
