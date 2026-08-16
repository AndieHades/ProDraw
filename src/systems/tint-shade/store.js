// Состояние окна генератора: базовый цвет, режим гармонии, выбранные цвета (rgb[]).
import { rgbToHex } from '../../logic/color.js';

export const tsg = { base: null, harmony: null, sel: [] };

const key = (c) => rgbToHex(c);
export const isSel = (c) => tsg.sel.some((s) => key(s) === key(c));

export function toggleSel(c) {
  const i = tsg.sel.findIndex((s) => key(s) === key(c));
  if (i >= 0) tsg.sel.splice(i, 1); else tsg.sel.push(c.slice(0, 3));
}

// Групповой выбор: галочка у базового цвета берёт/снимает всю шкалу целиком.
export const allSel = (colors) => colors.length > 0 && colors.every((c) => isSel(c));
export function setGroup(colors, on) {
  for (const c of colors) {
    const i = tsg.sel.findIndex((s) => key(s) === key(c));
    if (on && i < 0) tsg.sel.push(c.slice(0, 3));
    else if (!on && i >= 0) tsg.sel.splice(i, 1);
  }
}

export function openWith(base) { tsg.base = base.slice(0, 3); tsg.harmony = null; tsg.sel = []; }
