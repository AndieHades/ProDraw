// Состояние окна генератора: базовый цвет, режим гармонии, выбранные цвета (rgb[]).
import { rgbToHex } from "../../logic/color.ts";

export interface TintShadeState {
  base: number[] | null;
  harmony: string | null;
  sel: number[][];
}

export const tsg: TintShadeState = { base: null, harmony: null, sel: [] };

const key = (c: readonly number[]): string => rgbToHex(c);
export const isSel = (c: readonly number[]): boolean =>
  tsg.sel.some((s) => key(s) === key(c));

export function toggleSel(c: readonly number[]): void {
  const i = tsg.sel.findIndex((s) => key(s) === key(c));
  if (i >= 0) tsg.sel.splice(i, 1); else tsg.sel.push(c.slice(0, 3));
}

// Групповой выбор: галочка у базового цвета берёт/снимает всю шкалу целиком.
export const allSel = (colors: readonly (readonly number[])[]): boolean =>
  colors.length > 0 && colors.every((c) => isSel(c));

export function setGroup(colors: readonly (readonly number[])[], on: boolean): void {
  for (const c of colors) {
    const i = tsg.sel.findIndex((s) => key(s) === key(c));
    if (on && i < 0) tsg.sel.push(c.slice(0, 3));
    else if (!on && i >= 0) tsg.sel.splice(i, 1);
  }
}

export function openWith(base: readonly number[]): void {
  tsg.base = base.slice(0, 3); tsg.harmony = null; tsg.sel = [];
}
