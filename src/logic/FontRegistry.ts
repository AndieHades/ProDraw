import { TEXT_FONTS, TEXT_IMPORT } from "../config/text.ts";

export interface FontRecord {
  readonly id: string; name: string; family: string; readonly format?: string;
  readonly builtin?: boolean; readonly folder?: boolean; readonly order?: number;
  readonly createdAt?: number; updatedAt?: number; readonly data?: ArrayBuffer;
}
export interface FontFileLike { readonly name?: string; readonly size?: number }
export const fontExtension = (name: string): string =>
  (name.split(".").pop() ?? "").toLowerCase();
export const safeFontName = (name: string): string =>
  name.replace(/\.[^.]+$/, "").trim() || "Font";
export const fontCssFamily = (id: string): string =>
  `PixelHeartFont_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
export function isSupportedFontFile(file: FontFileLike | null | undefined): boolean {
  return !!file && TEXT_IMPORT.formats.includes(fontExtension(file.name ?? "")) &&
    (!file.size || file.size <= TEXT_IMPORT.maxBytes);
}
export function sortFontRecords<T extends { readonly order?: number }>(
  records: readonly T[]): T[] {
  return [...records].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
export function resolveFont(id: string, fonts: readonly FontRecord[] =
  TEXT_FONTS): FontRecord {
  return fonts.find((font) => font.id === id) ?? fonts[0] ?? TEXT_FONTS[0]!;
}
