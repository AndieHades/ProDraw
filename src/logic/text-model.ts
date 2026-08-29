import { TEXT_DEFAULT, TEXT_LETTER_SPACING, TEXT_LINE_SPACING, TEXT_NAME,
  TEXT_SIZE } from "../config/text.ts";
import { clampRound } from "./math.ts";

export interface TextBox { x: number; y: number; w: number; h: number }
export interface TextTransform { x: number; y: number; scaleX: number; scaleY: number;
  rotation: number }
export interface TextSource {
  value: string; fontId: string; size: number; color: string; letterSpacing: number;
  lineSpacing: number; uppercase: boolean; align: string; box: TextBox;
  transform: TextTransform;
}
type LooseObject = Record<string, unknown>;
const HEX = /^#[0-9a-fA-F]{6}$/;
const ALIGNS = new Set(["left", "center", "right"]);
const object = (value: unknown): LooseObject =>
  value && typeof value === "object" ? value as LooseObject : {};
const finite = (value: unknown, fallback: number): number =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const hex = (value: unknown, fallback = TEXT_DEFAULT.color): string =>
  HEX.test(text(value)) ? text(value).toLowerCase() : fallback;
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

function normLineSpacing(source: LooseObject): number {
  if (source.lineSpacing != null) return clampRound(finite(source.lineSpacing,
    TEXT_DEFAULT.lineSpacing), TEXT_LINE_SPACING.min, TEXT_LINE_SPACING.max);
  if (source.lineHeight != null) {
    const legacy = (finite(source.lineHeight, TEXT_DEFAULT.lineHeight) - 1) *
      finite(source.size, TEXT_DEFAULT.size);
    return clampRound(legacy, TEXT_LINE_SPACING.min, TEXT_LINE_SPACING.max);
  }
  return TEXT_DEFAULT.lineSpacing;
}
function normBox(value: unknown): TextBox {
  const box = object(value), defaults = TEXT_DEFAULT.box;
  return { x: Math.round(finite(box.x, defaults.x)), y: Math.round(finite(box.y, defaults.y)),
    w: Math.max(1, Math.round(finite(box.w, defaults.w))),
    h: Math.max(1, Math.round(finite(box.h, defaults.h))) };
}
function normTransform(value: unknown): TextTransform {
  const transform = object(value), defaults = TEXT_DEFAULT.transform;
  return { x: finite(transform.x, defaults.x), y: finite(transform.y, defaults.y),
    scaleX: finite(transform.scaleX, defaults.scaleX) || defaults.scaleX,
    scaleY: finite(transform.scaleY, defaults.scaleY) || defaults.scaleY,
    rotation: finite(transform.rotation, defaults.rotation) };
}

export function normalizeTextPrefs(value: unknown = {}): Omit<TextSource, "value" |
  "align" | "box" | "transform"> {
  const source = object(value);
  return { fontId: text(source.fontId, TEXT_DEFAULT.fontId) || TEXT_DEFAULT.fontId,
    size: clampRound(finite(source.size, TEXT_DEFAULT.size), TEXT_SIZE.min, TEXT_SIZE.max),
    color: hex(source.color), letterSpacing: clampRound(finite(source.letterSpacing,
      TEXT_DEFAULT.letterSpacing), TEXT_LETTER_SPACING.min, TEXT_LETTER_SPACING.max),
    lineSpacing: normLineSpacing(source),
    uppercase: bool(source.uppercase, TEXT_DEFAULT.uppercase) };
}
export function normalizeTextSource(value: unknown = {}): TextSource {
  const source = object(value), prefs = normalizeTextPrefs(source);
  return { value: text(source.value, TEXT_DEFAULT.value), ...prefs,
    align: ALIGNS.has(text(source.align)) ? text(source.align) : TEXT_DEFAULT.align,
    box: normBox(source.box), transform: normTransform(source.transform) };
}
export function cloneTextSource(source: unknown = {}): TextSource {
  const normalized = normalizeTextSource(source);
  return { ...normalized, box: { ...normalized.box }, transform: { ...normalized.transform } };
}
export function moveTextSource(source: unknown, dx: unknown, dy: unknown): TextSource {
  const output = cloneTextSource(source);
  output.box.x += Math.round(finite(dx, 0)); output.box.y += Math.round(finite(dy, 0));
  return output;
}
export function transformTextSource(source: unknown, value: unknown = {}): TextSource {
  const output = cloneTextSource(source), transform = object(value);
  output.box.x += Math.round(finite(transform.tx, 0));
  output.box.y += Math.round(finite(transform.ty, 0));
  output.transform.scaleX *= finite(transform.sx, 1);
  output.transform.scaleY *= finite(transform.sy, 1);
  output.transform.rotation += finite(transform.ang, 0); return output;
}
export function textLayerName(value: unknown, fallback = ""): string {
  const word = text(value).trim().split(/\s+/).find(Boolean) || text(fallback);
  return word.slice(0, TEXT_NAME.max) || fallback;
}
export const isTextLayer = (value: unknown): boolean => !!value &&
  typeof value === "object" && (value as LooseObject).kind === "text" &&
  !!(value as LooseObject).text;
